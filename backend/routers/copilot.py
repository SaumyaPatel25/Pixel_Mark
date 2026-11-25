import os
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from dependencies import get_db, get_current_user_optional
from models.core import User, Session as DbSession, Project
from markers.models import Marker
from markers.schemas import MarkerRead
from markers.repository import MarkerRepository
from markers.router import resolve_actor_context, invalidate_project_analytics_cache
from realtime.redis_broadcaster import redis_broadcaster
from realtime.events import build_marker_event
from services.copilot_service import (
    resolve_ai_provider,
    parse_copilot_dom_intent,
    analyze_site_context,
    generate_developer_fix,
)
from services.webhook_dispatcher import dispatch_direct_project_webhook, dispatch_webhooks_for_outbox

logger = logging.getLogger("stage.copilot")

router = APIRouter(tags=["Copilot"])


class CopilotResolution(BaseModel):
    selector: str = "body"
    css_mutations: Dict[str, Any] = Field(default_factory=dict)
    css_rules: str = ""
    text_mutation: Optional[str] = None
    client_summary: str = ""
    developer_explanation: str = ""
    developer_directive: Optional[str] = None
    benchmark_name: Optional[str] = None
    benchmark_url: Optional[str] = None
    benchmark_pattern: Optional[str] = None
    developer_code_spec: Optional[str] = None
    rect: Optional[Dict[str, Any]] = None
    confidence: float = 0.0


class CopilotParseRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    micro_dom: List[Dict[str, Any]] = Field(default_factory=list)
    viewport: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    mock_client: Optional[bool] = False


class CopilotConfirmPinRequest(BaseModel):
    session_id: str
    selector: str
    image_base64: Optional[str] = None
    inspo_image_url: Optional[str] = None
    css_mutations: Optional[Dict[str, Any]] = None
    css_rules: Optional[str] = None
    text_mutation: Optional[str] = None
    client_summary: str = Field(..., min_length=1)
    developer_explanation: Optional[str] = None
    developer_directive: Optional[str] = None
    benchmark_name: Optional[str] = None
    benchmark_url: Optional[str] = None
    benchmark_pattern: Optional[str] = None
    developer_code_spec: Optional[str] = None
    rect: Optional[Dict[str, Any]] = None
    page_url: Optional[str] = None
    offset_x_ratio: Optional[float] = 0.5
    offset_y_ratio: Optional[float] = 0.5


class CopilotDevFixRequest(BaseModel):
    marker_id: Optional[str] = None
    selector: str = Field(..., min_length=1)
    comment: str = Field(..., min_length=1)
    target_url: Optional[str] = None
    image_base64: Optional[str] = None
    inspo_image_url: Optional[str] = None
    mock_client: Optional[bool] = False


class CopilotDevFixResponse(BaseModel):
    marker_id: Optional[str] = None
    issue_analysis: str
    suggested_code: str
    file_hint: str
    css_rules: Optional[str] = ""


class SiteSuggestion(BaseModel):
    id: str
    title: str
    impact_tag: str
    selector: str
    description: str
    developer_directive: Optional[str] = None
    source_platform: Optional[str] = None
    benchmark_name: Optional[str] = None
    benchmark_url: Optional[str] = None
    benchmark_pattern: Optional[str] = None
    developer_code_spec: Optional[str] = None
    theme_colors: List[str] = Field(default_factory=list)
    css_mutations: Dict[str, Any] = Field(default_factory=dict)
    css_rules: str = ""


class SiteFingerprintRequest(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    hero_summary: Optional[str] = ""
    nav_items: Optional[List[str]] = Field(default_factory=list)
    headings: Optional[List[Any]] = Field(default_factory=list)
    dominant_colors: Optional[List[str]] = Field(default_factory=list)
    colors: Optional[List[str]] = None
    cta_buttons: Optional[List[Any]] = Field(default_factory=list)
    ctas: Optional[List[Any]] = None
    focused_element: Optional[Dict[str, Any]] = None
    observed_apis: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    mock_client: Optional[bool] = False


class SiteContextResponse(BaseModel):
    business_category: str
    aesthetic_summary: str
    dominant_colors: List[str] = Field(default_factory=list)
    top_3_suggestions: List[SiteSuggestion] = Field(default_factory=list)


@router.post("/api/copilot/agent-reach/read")
@router.post("/copilot/agent-reach/read")
async def agent_reach_read_endpoint(
    payload: Dict[str, Any],
):
    """Read-only Agent-Reach public content reader routed through rotating proxy IPs."""
    from services.agent_reach_service import read_public_url
    url = str(payload.get("url") or "").strip()
    return await read_public_url(url)


@router.post("/api/copilot/parse", response_model=CopilotResolution)
@router.post("/copilot/parse", response_model=CopilotResolution)
async def parse_copilot_intent_endpoint(
    payload: CopilotParseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Parses natural language/voice input against extracted micro-DOM candidates.
    Extracts user credentials (if present) to resolve BYOK keys from vault;
    otherwise cascades through free Groq Llama 3.3 -> Gemini Flash -> OpenAI mini.
    """
    is_mock = bool(payload.mock_client) or (os.getenv("COPILOT_MOCK_CLIENT") == "true")

    try:
        provider_config = None
        if not is_mock:
            provider_config = await resolve_ai_provider(db=db, user=current_user)
            if not provider_config:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active AI provider configured for Copilot. Please configure an API key or enable Groq/Gemini."
                )

        resolution = await parse_copilot_dom_intent(
            user_prompt=payload.prompt,
            micro_dom=payload.micro_dom,
            provider_config=provider_config,
            db=db,
            user=current_user,
            mock_client=is_mock
        )
        return resolution
    except HTTPException:
        raise
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(re))
    except Exception as e:
        logger.error(f"Copilot parse error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Copilot parse failed: {str(e)}"
        )


@router.post("/api/copilot/analyze-site", response_model=SiteContextResponse)
@router.post("/copilot/analyze-site", response_model=SiteContextResponse)
async def analyze_site_endpoint(
    payload: SiteFingerprintRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Analyzes extracted site fingerprint (title, headings, colors, CTAs)
    against UI design heuristics and produces business categorization,
    aesthetic posture, and top 3 high-impact UI suggestions with CSS rules.
    """
    is_mock = bool(payload.mock_client) or (os.getenv("COPILOT_MOCK_CLIENT") == "true")

    fingerprint_dict = payload.model_dump()
    if payload.colors and not payload.dominant_colors:
        fingerprint_dict["dominant_colors"] = payload.colors
    if payload.ctas and not payload.cta_buttons:
        fingerprint_dict["cta_buttons"] = payload.ctas

    try:
        provider_config = None
        if not is_mock:
            provider_config = await resolve_ai_provider(db=db, user=current_user)

        analysis = await analyze_site_context(
            site_fingerprint=fingerprint_dict,
            provider_config=provider_config,
            mock_client=is_mock,
            db=db,
            user=current_user
        )
        return analysis
    except Exception as e:
        logger.error(f"Site analysis endpoint failed: {e}", exc_info=True)
        from services.copilot_service import _mock_site_analysis
        return _mock_site_analysis(fingerprint_dict)


@router.post("/api/copilot/confirm-pin", status_code=status.HTTP_201_CREATED)
@router.post("/copilot/confirm-pin", status_code=status.HTTP_201_CREATED)
async def confirm_copilot_pin_endpoint(
    payload: CopilotConfirmPinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_reviewer_id: Optional[str] = Header(None)
):
    """
    Persists confirmed Copilot visual change as an interactive STAGE Marker.
    Stores cropped screenshot, CSS mutations, scoped CSS rules, and text changes.
    Dispatches notifications to the developer outbox and realtime webhooks.
    """
    # 1. Fetch Session to establish ownership and Project reference
    session_result = await db.execute(
        select(DbSession).where(DbSession.id == payload.session_id)
    )
    sess = session_result.scalar_one_or_none()
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found for session_id '{payload.session_id}'"
        )

    # 2. Resolve actor identity
    actor = await resolve_actor_context(payload.session_id, db, current_user, x_reviewer_id)

    # 3. Assemble structured AI metadata
    directive_text = payload.developer_directive or payload.developer_explanation or ""
    metadata = {
        "css_mutations": payload.css_mutations or {},
        "css_rules": payload.css_rules or "",
        "text_mutation": payload.text_mutation,
        "source": "ai_copilot",
        "developer_directive": directive_text,
        "benchmark_name": payload.benchmark_name or "",
        "benchmark_url": payload.benchmark_url or "",
        "benchmark_pattern": payload.benchmark_pattern or "",
        "developer_code_spec": payload.developer_code_spec or ""
    }
    if payload.inspo_image_url:
        metadata["inspo_image_url"] = payload.inspo_image_url

    element_rect = dict(payload.rect or {})
    element_rect["metadata"] = metadata
    element_rect["developer_directive"] = directive_text
    element_rect["benchmark_name"] = payload.benchmark_name or ""
    element_rect["benchmark_url"] = payload.benchmark_url or ""
    element_rect["developer_code_spec"] = payload.developer_code_spec or ""
    if payload.inspo_image_url:
        element_rect["inspo_image_url"] = payload.inspo_image_url

    top = float(element_rect.get("top", 0.0)) if "top" in element_rect else 0.0
    left = float(element_rect.get("left", 0.0)) if "left" in element_rect else 0.0
    width = float(element_rect.get("width", 0.0)) if "width" in element_rect else 0.0
    height = float(element_rect.get("height", 0.0)) if "height" in element_rect else 0.0
    scroll_x = float(element_rect.get("scroll_x", 0.0)) if "scroll_x" in element_rect else 0.0
    scroll_y = float(element_rect.get("scroll_y", 0.0)) if "scroll_y" in element_rect else 0.0
    viewport_w = float(element_rect.get("viewport_width", 1280.0)) if "viewport_width" in element_rect else 1280.0
    viewport_h = float(element_rect.get("viewport_height", 800.0)) if "viewport_height" in element_rect else 800.0

    offset_x = float(payload.offset_x_ratio) if payload.offset_x_ratio is not None else 0.5
    offset_y = float(payload.offset_y_ratio) if payload.offset_y_ratio is not None else 0.5

    # Center point on target element in page coordinates
    page_x = left + (width * offset_x) if width > 0 else left
    page_y = top + (height * offset_y) if height > 0 else top

    # Fallback to visible position if rect is missing or coords resolved to 0,0
    if page_x == 0.0 and page_y == 0.0:
        page_x = 320.0
        page_y = 160.0

    viewport_x = page_x - scroll_x
    viewport_y = page_y - scroll_y

    # Resolve active URL from payload, session current_page_url, or target_url
    resolved_page_url = (
        payload.page_url
        or getattr(sess, "current_page_url", None)
        or getattr(sess, "target_url", None)
        or getattr(sess, "url", None)
    )

    # 4. Construct Marker instance
    marker = Marker(
        project_id=sess.project_id,
        session_id=payload.session_id,
        creator_id=actor["id"],
        creator_name="STAGE Copilot",
        creator_role=actor.get("role") or "reviewer",
        color_token="ai_copilot",
        anchor_kind="dom-relative",
        anchor_mode="dom",
        page_url=resolved_page_url,
        target_selector=payload.selector,
        offset_x_ratio=offset_x,
        offset_y_ratio=offset_y,
        page_x=page_x,
        page_y=page_y,
        viewport_x=viewport_x,
        viewport_y=viewport_y,
        viewport_width=viewport_w,
        viewport_height=viewport_h,
        scroll_x=scroll_x,
        scroll_y=scroll_y,
        element_rect_json=element_rect,
        title=payload.client_summary,
        description=directive_text,
        screenshot_url=payload.image_base64,
        encrypted_context=json.dumps(metadata),
        status="open",
        priority="high" if payload.benchmark_name else "medium",
        version=1
    )

    repo = MarkerRepository(db)
    await repo.create_marker(marker)
    await db.flush()

    # 5. Outbox & Webhook Notifications
    webhook_payload_data = {
        "id": marker.id,
        "marker_id": marker.id,
        "title": marker.title or "New AI UX Pin",
        "description": marker.description,
        "developer_directive": directive_text,
        "benchmark_name": payload.benchmark_name or "",
        "benchmark_url": payload.benchmark_url or "",
        "developer_code_spec": payload.developer_code_spec or "",
        "selector": marker.target_selector or payload.selector,
        "status": marker.status
    }

    try:
        from services.notification_service import emit_pin_event
        await emit_pin_event(
            db=db,
            event_type="pin.created",
            marker=webhook_payload_data,
            session_id=payload.session_id,
            project_id=sess.project_id,
            actor_id=actor["id"],
            actor_role=actor["role"]
        )
    except Exception as oe:
        logger.warning(f"[Outbox] Failed to write outbox pin event: {oe}")

    # Check for direct Project webhook URL (e.g. Slack/Discord)
    try:
        proj_res = await db.execute(select(Project).where(Project.id == sess.project_id))
        proj = proj_res.scalar_one_or_none()
        if proj and proj.webhook_url:
            import asyncio
            asyncio.create_task(
                dispatch_direct_project_webhook(
                    webhook_url=proj.webhook_url,
                    event_type="pin.created",
                    data=webhook_payload_data,
                    project_id=sess.project_id
                )
            )
        # Also fan out to any registered project webhooks
        import asyncio
        asyncio.create_task(
            dispatch_webhooks_for_outbox(
                project_id=sess.project_id,
                event_type="pin.created",
                payload={
                    "event": "pin.created",
                    "project_id": sess.project_id,
                    "session_id": payload.session_id,
                    "marker_id": marker.id,
                    "data": webhook_payload_data,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )
    except Exception as whe:
        logger.warning(f"[Direct Webhook] Failed to dispatch project webhook: {whe}")

    # 6. Commit transaction
    await db.commit()
    await db.refresh(marker)
    invalidate_project_analytics_cache(sess.project_id)

    # 7. Realtime WebSockets / Redis broadcast
    try:
        event = build_marker_event(
            event_type="marker_created",
            session_id=payload.session_id,
            marker=marker,
            actor_id=actor["id"],
            actor_role=actor["role"]
        )
        await redis_broadcaster.publish_event(payload.session_id, event)
    except Exception as e:
        logger.warning(f"[WS] Failed to broadcast marker_created event: {e}")

    # 8. Human-friendly session notification
    try:
        from services.notification_service import emit_session_notification
        creator_name = actor.get("name") or marker.creator_name or "STAGE Copilot"
        target_desc = marker.target_selector or "element"
        pin_detail = marker.title or "AI visual edit"
        await emit_session_notification(
            db=db,
            session_id=payload.session_id,
            event_type="marker_created",
            entity_type="marker",
            entity_id=marker.id,
            title=f"New Pin: {marker.title or 'AI Visual Change'}",
            body=f"{creator_name} added an AI copilot pin on {target_desc}: \"{pin_detail}\"",
            project_id=sess.project_id,
            user_id=actor["id"] if actor.get("role") == "user" else None,
            metadata={
                "marker_id": marker.id,
                "target_selector": marker.target_selector,
                "actor_name": creator_name,
                "title": marker.title,
                "description": marker.description,
                "source": "ai_copilot",
                "css_mutations": payload.css_mutations or {},
                "css_rules": payload.css_rules or "",
                "text_mutation": payload.text_mutation
            }
        )
    except Exception as ne:
        logger.warning(f"[STAGE Notification] Failed to emit marker_created event: {ne}")

    # Return complete canonical Marker data compatible with MarkerRead and store upsert
    marker_dict = MarkerRead.model_validate(marker).model_dump(mode="json")
    marker_dict.update({
        "marker_id": marker.id,
        "selector": marker.target_selector or payload.selector,
        "status": "created",
        "metadata": metadata
    })
    return marker_dict


@router.post("/api/copilot/generate-dev-fix", response_model=CopilotDevFixResponse)
@router.post("/copilot/generate-dev-fix", response_model=CopilotDevFixResponse)
async def generate_dev_fix_endpoint(
    payload: CopilotDevFixRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Generates an automated, production-ready developer code fix, root cause analysis,
    and scoped CSS rules for an observation pin.
    """
    is_mock = bool(payload.mock_client) or (os.getenv("COPILOT_MOCK_CLIENT") == "true")
    provider_config = None
    if not is_mock:
        provider_config = await resolve_ai_provider(db=db, user=current_user)

    fix = await generate_developer_fix(
        marker_id=payload.marker_id,
        selector=payload.selector,
        comment=payload.comment,
        target_url=payload.target_url,
        image_base64=payload.image_base64,
        inspo_image_url=payload.inspo_image_url,
        provider_config=provider_config,
        is_mock=is_mock
    )
    return fix

