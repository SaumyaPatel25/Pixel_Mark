from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dependencies import get_db, get_current_user
from models import Session, Marker, User, Project, OrgMember
from models.core import UserAIProviderConfig
from services.ai_service import triage_markers, summarize_session
from routers.ai_provider_configs import maybe_decrypt_api_key

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/triage/session/{session_id}")
async def triage_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Load the session from DB using session_id.
    result = await db.execute(
        select(Session, Project)
        .join(Project, Session.project_id == Project.id)
        .where(Session.id == session_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session, project = row

    # Check if session belongs to current_user
    member_result = await db.execute(
        select(OrgMember).where(
            OrgMember.org_id == project.org_id,
            OrgMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # 2. Load all markers for this session from DB.
    markers_result = await db.execute(
        select(Marker)
        .where(Marker.session_id == session_id)
        .order_by(Marker.created_at.desc())
    )
    markers = markers_result.scalars().all()

    # 3. If len(markers) == 0:
    if len(markers) == 0:
        raise HTTPException(status_code=400, detail="No markers to triage")

    # Load active default AI provider config
    provider_res = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.user_id == current_user.id)
        .where(UserAIProviderConfig.is_active == True)
        .where(UserAIProviderConfig.is_default == True)
    )
    provider_config_db = provider_res.scalar_one_or_none()
    if not provider_config_db:
        raise HTTPException(status_code=400, detail="No active default AI provider configured")
        
    usable_key = maybe_decrypt_api_key(provider_config_db.encrypted_api_key) if provider_config_db.encrypted_api_key else ""
    provider_config = {
        "provider": provider_config_db.provider,
        "api_key": usable_key,
        "base_url": provider_config_db.base_url,
        "model_name": provider_config_db.model_name,
        "supports_openai_compat": provider_config_db.supports_openai_compat
    }

    # 4. Convert markers to list of dicts
    marker_dicts = [
        {
            "id": str(m.id),
            "title": m.title,
            "description": m.description,
            "issue_type": getattr(m, "issue_type", None),
            "severity": getattr(m, "severity", None),
            "page_url": getattr(m, "page_url", None) or m.url,
            "inner_text": getattr(m, "inner_text", None),
            "console_errors": getattr(m, "console_errors", []),
            "network_errors": getattr(m, "network_errors", []),
            "renderer_type": getattr(m, "renderer_type", "dom"),
        }
        for m in markers
    ]

    # 5. Call AI service
    try:
        target_url = ""
        # The prompt says target_url=getattr(session, "target_url", "") or ""
        # But core.py doesn't have target_url on Session. It has current_page_url, or Project has url.
        if hasattr(session, "target_url") and getattr(session, "target_url"):
            target_url = getattr(session, "target_url")
        elif hasattr(project, "url") and project.url:
            target_url = project.url
            
        ai_result = await triage_markers(
            marker_dicts,
            session_title=session.title or "Untitled Session",
            target_url=target_url,
            provider_config=provider_config
        )
    except RuntimeError as e:
        msg = str(e)
        if "not implemented" in msg.lower():
            raise HTTPException(status_code=501, detail=msg)
        raise HTTPException(status_code=503, detail=msg)

    # 6. Apply AI results back to DB
    for item in ai_result.get("markers", []):
        for marker in markers:
            if str(marker.id) == item.get("id"):
                marker.priority = item.get("priority")
                marker.ai_summary = item.get("ai_summary")
                break
                
    await db.commit()

    # 7. Return
    return {
        "triaged_count": len(ai_result.get("markers", [])),
        "session_summary": ai_result.get("session_summary", ""),
        "markers": ai_result.get("markers", [])
    }


@router.get("/summary/session/{session_id}")
async def get_session_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Load session from DB.
    result = await db.execute(
        select(Session, Project)
        .join(Project, Session.project_id == Project.id)
        .where(Session.id == session_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session, project = row

    # Check ownership
    member_result = await db.execute(
        select(OrgMember).where(
            OrgMember.org_id == project.org_id,
            OrgMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # 2. Load all markers
    markers_result = await db.execute(
        select(Marker)
        .where(Marker.session_id == session_id)
        .order_by(Marker.created_at.desc())
    )
    markers = markers_result.scalars().all()

    # 3. If len(markers) == 0:
    if len(markers) == 0:
        raise HTTPException(status_code=400, detail="No markers to summarize")

    # Load active default AI provider config
    provider_res = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.user_id == current_user.id)
        .where(UserAIProviderConfig.is_active == True)
        .where(UserAIProviderConfig.is_default == True)
    )
    provider_config_db = provider_res.scalar_one_or_none()
    if not provider_config_db:
        raise HTTPException(status_code=400, detail="No active default AI provider configured")
        
    usable_key = maybe_decrypt_api_key(provider_config_db.encrypted_api_key) if provider_config_db.encrypted_api_key else ""
    provider_config = {
        "provider": provider_config_db.provider,
        "api_key": usable_key,
        "base_url": provider_config_db.base_url,
        "model_name": provider_config_db.model_name,
        "supports_openai_compat": provider_config_db.supports_openai_compat
    }

    # 4. Convert markers to dicts
    marker_dicts = [
        {
            "id": str(m.id),
            "title": m.title,
            "description": m.description,
            "issue_type": getattr(m, "issue_type", None),
            "severity": getattr(m, "severity", None),
            "page_url": getattr(m, "page_url", None) or m.url,
            "inner_text": getattr(m, "inner_text", None),
            "console_errors": getattr(m, "console_errors", []),
            "network_errors": getattr(m, "network_errors", []),
            "renderer_type": getattr(m, "renderer_type", "dom"),
        }
        for m in markers
    ]

    # 5. Call AI service
    try:
        target_url = ""
        if hasattr(session, "target_url") and getattr(session, "target_url"):
            target_url = getattr(session, "target_url")
        elif hasattr(project, "url") and project.url:
            target_url = project.url

        ai_result = await summarize_session(
            marker_dicts,
            session_title=session.title or "Untitled Session",
            target_url=target_url,
            provider_config=provider_config
        )
    except RuntimeError as e:
        msg = str(e)
        if "not implemented" in msg.lower():
            raise HTTPException(status_code=501, detail=msg)
        raise HTTPException(status_code=503, detail=msg)

    # 6. Add counts
    ai_result["total_markers"] = len(markers)
    ai_result["critical_count"] = sum(1 for m in markers if getattr(m.priority, "value", str(m.priority)) == "critical")
    ai_result["high_count"] = sum(1 for m in markers if getattr(m.priority, "value", str(m.priority)) == "high")
    ai_result["medium_count"] = sum(1 for m in markers if getattr(m.priority, "value", str(m.priority)) == "medium")
    ai_result["low_count"] = sum(1 for m in markers if getattr(m.priority, "value", str(m.priority)) == "low")

    # 7. Return directly
    return ai_result
