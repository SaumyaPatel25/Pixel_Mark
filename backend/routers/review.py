from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ShareLink, Session, Project
from dependencies import get_db
from datetime import datetime, timezone
import os
import logging

logger = logging.getLogger("uvicorn")

router = APIRouter()

@router.get("/{token}")
async def public_review_redirect(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Redirect public review tokens to the frontend."""
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)
    )
    link = result.scalar_one_or_none()
    
    if not link:
        raise HTTPException(status_code=404, detail="Token not found")
    
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Token expired")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=f"{frontend_url.rstrip('/')}/review/{token}")

@router.get("/{token}/session")
async def get_public_session_info(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Return session info for public review mode."""
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)
    )
    link = result.scalar_one_or_none()
    
    if not link:
        raise HTTPException(status_code=404, detail="Token not found")
    
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Token expired")
    
    # If password protected, we expect the frontend to have verified it via /share-links/resolve
    # and potentially passed some verification (like a session cookie or just trust for now).
    # In a real app, we'd check a signed cookie here.
    
    session_result = await db.execute(select(Session).where(Session.id == link.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    project_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = project_result.scalar_one_or_none()
    
    # Log access
    client_host = request.client.host if request.client else "unknown"
    logger.info(f"Public access to session {session.id} via token {token} from IP {client_host}")
    
    # Increment accessed_count
    link.accessed_count += 1
    await db.commit()
    
    return {
        "session_id": session.id,
        "session_title": session.title,
        "project_name": project.name if project else "Unknown",
        "proxy_url": f"/proxy/session/{session.id}",
        "can_comment": link.can_comment,
        "renderer_hints": {}
    }


@router.get("/{token}/dom-edit-available")
async def get_reviewer_dom_edit_available(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or inactive")
        
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    session_result = await db.execute(select(Session).where(Session.id == link.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    project_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from services.plan_capabilities import resolve_org_plan
    plan_info = await resolve_org_plan(project.org_id, db)
    has_blueprint = plan_info.get("has_blueprint_dom_edit", False)
    project_toggle = getattr(project, "allow_reviewer_dom_edit", True)
    
    return {"dom_edit_available": bool(has_blueprint and project_toggle)}


from schemas import ReviewerDomEditSuggestionCreate
from models import ReviewerDomEditSuggestionModel, PageVisit
from datetime import timedelta
from auth import verify_password
from sqlalchemy import func

@router.post("/{token}/dom-edit-suggestions")
async def submit_reviewer_suggestion(
    token: str,
    payload: ReviewerDomEditSuggestionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or inactive")

    # Expiry check
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Max uses check
    if link.max_uses is not None and link.use_count >= link.max_uses:
        raise HTTPException(status_code=403, detail="Share link has reached maximum usage limit")

    # Password check
    if link.password_hash:
        password = request.headers.get("x-share-link-password") or payload.password
        if not password or not verify_password(password, link.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password")

    # Get session and project info
    session_result = await db.execute(select(Session).where(Session.id == link.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    project_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check entitlement and project-toggle
    from services.plan_capabilities import resolve_org_plan
    plan_info = await resolve_org_plan(project.org_id, db)
    has_blueprint = plan_info.get("has_blueprint_dom_edit", False)
    project_toggle = getattr(project, "allow_reviewer_dom_edit", True)
    if not (has_blueprint and project_toggle):
        raise HTTPException(status_code=403, detail="DOM Edit Suggestions not enabled for this project")

    # Validate reviewer identity exists for this session
    from markers.models import ReviewerIdentity
    reviewer_res = await db.execute(
        select(ReviewerIdentity).where(
            ReviewerIdentity.id == payload.reviewer_identity_id,
            ReviewerIdentity.session_id == session.id
        )
    )
    reviewer = reviewer_res.scalar_one_or_none()
    if not reviewer:
        raise HTTPException(status_code=400, detail="Invalid reviewer identity")

    # Cap suggestions per identity (Rate Limit)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    existing_count_res = await db.execute(
        select(func.count(ReviewerDomEditSuggestionModel.id))
        .where(
            ReviewerDomEditSuggestionModel.reviewer_identity_id == payload.reviewer_identity_id,
            ReviewerDomEditSuggestionModel.created_at >= one_hour_ago
        )
    )
    existing_count = existing_count_res.scalar() or 0
    if existing_count >= 50:
        raise HTTPException(status_code=429, detail="Too many suggestions submitted recently. Rate limit exceeded.")

    # Validate page_url
    is_valid_page = False
    if payload.page_url:
        if session.current_page_url and session.current_page_url in payload.page_url:
            is_valid_page = True
        elif project.url and project.url in payload.page_url:
            is_valid_page = True
        else:
            visits_res = await db.execute(
                select(PageVisit).where(PageVisit.session_id == session.id, PageVisit.page_url == payload.page_url)
            )
            if visits_res.scalar_one_or_none():
                is_valid_page = True

    if not is_valid_page:
        raise HTTPException(status_code=400, detail="Invalid page_url for this session")

    # Create the suggestion record
    suggestion = ReviewerDomEditSuggestionModel(
        project_id=project.id,
        share_link_id=link.id,
        reviewer_identity_id=reviewer.id,
        frame_id=payload.frame_id,
        page_url=payload.page_url,
        selector=payload.selector,
        xpath=payload.xpath,
        operation_type=payload.operation_type,
        proposed_value=payload.proposed_value,
        status="pending"
    )
    db.add(suggestion)
    await db.commit()
    await db.refresh(suggestion)

    return {"message": "Suggestion submitted successfully", "id": suggestion.id}
