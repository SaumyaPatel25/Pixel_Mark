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
from models.core import User, Session as DbSession
from markers.models import Marker
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

logger = logging.getLogger("stage.copilot")

router = APIRouter(tags=["Copilot"])


class CopilotResolution(BaseModel):
    selector: str
    css_mutations: Dict[str, Any] = Field(default_factory=dict)
    css_rules: str = ""
    text_mutation: Optional[str] = None
    client_summary: str = ""
    developer_explanation: str = ""
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
    rect: Optional[Dict[str, Any]] = None


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
    css_mutations: Dict[str, Any] = Field(default_factory=dict)
    css_rules: str = ""


class SiteFingerprintRequest(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    headings: Optional[List[Any]] = Field(default_factory=list)
    dominant_colors: Optional[List[str]] = Field(default_factory=list)
    colors: Optional[List[str]] = None
    cta_buttons: Optional[List[Any]] = Field(default_factory=list)
    ctas: Optional[List[Any]] = None
    mock_client: Optional[bool] = False


class SiteContextResponse(BaseModel):
    business_category: str
    aesthetic_summary: str
    dominant_colors: List[str] = Field(default_factory=list)
    top_3_suggestions: List[SiteSuggestion] = Field(default_factory=list)


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
    metadata = {
        "css_mutations": payload.css_mutations or {},
        "css_rules": payload.css_rules or "",
        "text_mutation": payload.text_mutation,
        "source": "ai_copilot"
    }
    if payload.inspo_image_url:
        metadata["inspo_image_url"] = payload.inspo_image_url

    element_rect = dict(payload.rect or {})
    element_rect["metadata"] = metadata
    if payload.inspo_image_url:
        element_rect["inspo_image_url"] = payload.inspo_image_url

    top = float(element_rect.get("top", 0.0)) if "top" in element_rect else 0.0
    left = float(element_rect.get("left", 0.0)) if "left" in element_rect else 0.0
    viewport_w = float(element_rect.get("viewport_width", 1280.0)) if "viewport_width" in element_rect else None
    viewport_h = float(element_rect.get("viewport_height", 800.0)) if "viewport_height" in element_rect else None

    # 4. Construct Marker instance
    marker = Marker(
        project_id=sess.project_id,
        session_id=payload.session_id,
        creator_id=actor["id"],
        creator_name="STAGE Copilot",
        creator_role=actor.get("role") or "reviewer",
        color_token="ai_copilot",
        anchor_kind="dom",
        anchor_mode="dom",
        page_url=getattr(sess, "target_url", None) or getattr(sess, "url", None),
        target_selector=payload.selector,
        page_x=left,
        page_y=top,
        viewport_width=viewport_w,
        viewport_height=viewport_h,
        element_rect_json=element_rect,
        title=payload.client_summary,
        description=payload.developer_explanation or "",
        screenshot_url=payload.image_base64,
        encrypted_context=json.dumps(metadata),
        status="open",
        priority="medium",
        version=1
    )

    repo = MarkerRepository(db)
    await repo.create_marker(marker)
    await db.flush()

    # 5. Outbox Notification
    try:
        from services.notification_service import emit_pin_event
        await emit_pin_event(
            db=db,
            event_type="pin.created",
            marker={"id": marker.id, "title": marker.title or "New Pin", "status": marker.status},
            session_id=payload.session_id,
            project_id=sess.project_id,
            actor_id=actor["id"],
            actor_role=actor["role"]
        )
    except Exception as oe:
        logger.warning(f"[Outbox] Failed to write outbox pin event: {oe}")

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

    return {
        "id": marker.id,
        "marker_id": marker.id,
        "session_id": marker.session_id,
        "selector": marker.target_selector or payload.selector,
        "status": "created",
        "title": marker.title,
        "description": marker.description,
        "screenshot_url": marker.screenshot_url,
        "element_rect_json": marker.element_rect_json,
        "created_at": marker.created_at.isoformat() if marker.created_at else None,
        "metadata": metadata
    }


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

