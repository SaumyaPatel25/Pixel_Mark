from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import AsyncSessionLocal
from dependencies import get_db, get_current_user
from models import Session, Marker, User, Project, OrgMember
from models.core import UserAIProviderConfig
from services.ai_service import triage_markers, summarize_session
from routers.ai_provider_configs import maybe_decrypt_api_key

router = APIRouter(prefix="/ai", tags=["AI"])

async def run_ai_triage_background(
    session_id: str,
    user_id: str,
    provider_config: dict
):
    from models import Marker, Session, Project
    from services.ai_service import triage_markers
    from routes.websocket import broadcast
    import logging

    logger = logging.getLogger("pixelmark.ai")
    logger.info(f"Starting background AI triage for session={session_id}")

    async with AsyncSessionLocal() as db:
        try:
            # Load session & project info
            result = await db.execute(
                select(Session, Project)
                .join(Project, Session.project_id == Project.id)
                .where(Session.id == session_id)
            )
            row = result.first()
            if not row:
                logger.error(f"Session {session_id} not found in background triage")
                return
            session, project = row

            # Load all markers
            markers_result = await db.execute(
                select(Marker)
                .where(Marker.session_id == session_id)
                .order_by(Marker.created_at.desc())
            )
            markers = markers_result.scalars().all()
            if not markers:
                logger.warning(f"No markers found to triage for session={session_id}")
                return

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

            target_url = ""
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

            # Apply AI results back to DB
            for item in ai_result.get("markers", []):
                for marker in markers:
                    if str(marker.id) == item.get("id"):
                        marker.priority = item.get("priority")
                        marker.ai_summary = item.get("ai_summary")
                        break
            
            await db.commit()

            # Broadcast completion via WebSocket
            await broadcast(session_id, {
                "type": "ai_triage_complete",
                "data": {"session_id": session_id}
            })
            logger.info(f"Successfully completed background AI triage for session={session_id}")

        except Exception as e:
            logger.error(f"Background AI triage failed for session={session_id}: {str(e)}")

@router.post("/triage/session/{session_id}")
async def triage_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import uuid
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

    # 2. Check if we have markers to triage
    markers_count_res = await db.execute(
        select(func.count(Marker.id)).where(Marker.session_id == session_id)
    )
    markers_count = markers_count_res.scalar() or 0
    if markers_count == 0:
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

    # Queue background triage task
    background_tasks.add_task(
        run_ai_triage_background,
        session_id=session_id,
        user_id=current_user.id,
        provider_config=provider_config
    )

    return {
        "status": "queued",
        "message": "AI triage is running in the background..."
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
