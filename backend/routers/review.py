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
