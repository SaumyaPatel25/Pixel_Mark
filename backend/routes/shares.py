from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models import ShareLink, User, Session as DBSession
from schemas import ShareLinkCreate, ShareLinkOut
from pydantic import BaseModel
from typing import Optional
from dependencies import get_db, get_current_user
from auth import hash_password, verify_password
import uuid
import secrets
import os
import logging

logger = logging.getLogger("pixelmark.shares")

class LegacyShareLinkAccess(BaseModel):
    password: Optional[str] = None

router = APIRouter(prefix="/shares", tags=["shares"])

def _build_share_url(token: str, request: Request | None = None) -> str:
    """Build the public review URL for a share token."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    # Strip trailing slash
    frontend_url = frontend_url.rstrip("/")
    return f"{frontend_url}/t/{token}"

def _link_to_dict(link: ShareLink, share_url: str) -> dict:
    return {
        "id": link.id,
        "token": link.token,
        "label": link.label or "Shared Link",
        "role": link.role or "tester",
        "can_comment": link.can_comment,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "max_uses": link.max_uses,
        "use_count": link.use_count or 0,
        "is_active": link.is_active if link.is_active is not None else True,
        "created_at": link.created_at.isoformat() if link.created_at else None,
        "share_url": share_url,
    }

# ── Project-scoped endpoints (used by SharePanel in frontend) ──────────────

@router.get("/project/{project_id}")
async def list_share_links_for_project(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all share links across all sessions of a project."""
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_LIST] [TRACE={trace_id}] Listing share links for project={project_id}")
    
    # Get all sessions for this project
    sessions_result = await db.execute(
        select(DBSession).where(DBSession.project_id == project_id)
    )
    sessions = sessions_result.scalars().all()
    session_ids = [s.id for s in sessions]

    if not session_ids:
        return []

    links_result = await db.execute(
        select(ShareLink).where(ShareLink.session_id.in_(session_ids))
    )
    links = links_result.scalars().all()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return [_link_to_dict(link, f"{frontend_url}/t/{link.token}") for link in links]


@router.post("/project/{project_id}")
async def create_share_link_for_project(
    project_id: str,
    data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a share link for the most recent session of a project."""
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_CREATE_PROJECT] [TRACE={trace_id}] Creating share link for project={project_id}, role={data.get('role')}")
    
    # Find the most recent session for this project
    result = await db.execute(
        select(DBSession)
        .where(DBSession.project_id == project_id)
        .order_by(DBSession.created_at.desc())
    )
    session = result.scalars().first()
    if not session:
        # Auto-create a session if none exists
        session = DBSession(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Default Session"
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        logger.info(f"[OBSERVABILITY] [SHARE_CREATE_PROJECT] [TRACE={trace_id}] Auto-created session={session.id} for project={project_id}")

    token = secrets.token_urlsafe(16)
    password_hash = None
    if data.get("password"):
        password_hash = hash_password(data["password"])

    # Compute expires_at from expires_in_days
    expires_at = None
    if data.get("expires_in_days"):
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(days=int(data["expires_in_days"]))

    role = data.get("role", "tester")
    # can_comment is true for tester and reviewer
    can_comment = role in ("tester", "reviewer")

    link = ShareLink(
        id=str(uuid.uuid4()),
        session_id=session.id,
        token=token,
        label=data.get("label") or "Shared Link",
        role=role,
        can_comment=can_comment,
        password_hash=password_hash,
        expires_at=expires_at,
        max_uses=data.get("max_uses"),
        use_count=0,
        is_active=True,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    share_url = f"{frontend_url}/t/{token}"
    logger.info(f"[OBSERVABILITY] [SHARE_CREATE_SUCCESS] [TRACE={trace_id}] Created link={link.id} for session={session.id}, url={share_url}")
    return _link_to_dict(link, share_url)


@router.delete("/project/{project_id}/{link_id}")
async def delete_share_link_for_project(
    project_id: str,
    link_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke (deactivate) a share link."""
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_REVOKE_PROJECT] [TRACE={trace_id}] Revoking share link={link_id} for project={project_id}")
    
    result = await db.execute(select(ShareLink).where(ShareLink.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        logger.warning(f"[OBSERVABILITY] [SHARE_REVOKE_FAIL] [TRACE={trace_id}] Share link={link_id} not found")
        raise HTTPException(status_code=404, detail="Share link not found")
    
    # Soft-delete: mark as inactive
    link.is_active = False
    await db.commit()
    logger.info(f"[OBSERVABILITY] [SHARE_REVOKE_SUCCESS] [TRACE={trace_id}] Soft-deleted/Deactivated share link={link_id}")
    return {"revoked": True}


# ── Legacy Session-scoped endpoints (kept for backwards compat) ────────────

@router.post("/", response_model=ShareLinkOut)
async def create_share_link(
    data: ShareLinkCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_CREATE_LEGACY] [TRACE={trace_id}] Creating share link for session={data.session_id}")
    
    token = secrets.token_urlsafe(16)
    password_hash = None
    if data.password:
        password_hash = hash_password(data.password)

    link = ShareLink(
        id=str(uuid.uuid4()),
        session_id=data.session_id,
        token=token,
        label="Shared Link",
        role="tester",
        can_comment=data.can_comment,
        password_hash=password_hash,
        expires_at=data.expires_at,
        use_count=0,
        is_active=True,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    logger.info(f"[OBSERVABILITY] [SHARE_CREATE_LEGACY_SUCCESS] [TRACE={trace_id}] Created link={link.id} for session={data.session_id}")
    return link

@router.get("/session/{session_id}", response_model=list[ShareLinkOut])
async def list_share_links(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_LIST_LEGACY] [TRACE={trace_id}] Listing legacy share links for session={session_id}")
    result = await db.execute(select(ShareLink).where(ShareLink.session_id == session_id))
    return result.scalars().all()

@router.post("/access/{token}")
async def access_share_link(
    token: str, 
    data: LegacyShareLinkAccess, 
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from models import Project
    from datetime import datetime
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_ACCESS_ATTEMPT] [TRACE={trace_id}] Accessing share token={token}")
    
    result = await db.execute(select(ShareLink).where(ShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link:
        logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Share link token={token} not found")
        raise HTTPException(status_code=404, detail="Invalid share link token")

    if link.expires_at and link.expires_at < datetime.utcnow():
        logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Share link token={token} has expired (expires_at={link.expires_at})")
        raise HTTPException(status_code=410, detail="Share link has expired")

    if not link.is_active:
        logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Share link token={token} has been revoked/deactivated")
        raise HTTPException(status_code=410, detail="Share link has been revoked")

    if link.max_uses and (link.use_count or 0) >= link.max_uses:
        logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Share link token={token} reached max uses limit ({link.max_uses})")
        raise HTTPException(status_code=410, detail="Share link has reached its maximum use limit")

    if link.password_hash:
        if not data.password or not verify_password(data.password, link.password_hash):
            logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Invalid password provided for share link token={token}")
            raise HTTPException(status_code=403, detail="Invalid password for share link")

    # Increment use count
    link.use_count = (link.use_count or 0) + 1
    await db.commit()
    logger.info(f"[OBSERVABILITY] [SHARE_ACCESS_SUCCESS] [TRACE={trace_id}] Share link token={token} successfully accessed. Incremented use_count to {link.use_count}")

    # Get session and project details
    session_result = await db.execute(select(DBSession).where(DBSession.id == link.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Associated session={link.session_id} not found for token={token}")
        raise HTTPException(status_code=404, detail="Associated session not found")

    project_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        logger.warning(f"[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Associated project={session.project_id} not found for token={token}")
        raise HTTPException(status_code=404, detail="Associated project not found")

    return {
        "session_id": session.id,
        "title": session.title,
        "can_comment": link.can_comment,
        "role": link.role or "tester",
        "id": project.id,
        "project_id": project.id,
        "name": project.name,
        "project_name": project.name,
        "url": project.url,
        "target_url": project.url
    }

@router.delete("/{share_id}")
async def delete_share_link(
    share_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [SHARE_DELETE_LEGACY] [TRACE={trace_id}] Deleting legacy share link={share_id}")
    await db.execute(delete(ShareLink).where(ShareLink.id == share_id))
    await db.commit()
    logger.info(f"[OBSERVABILITY] [SHARE_DELETE_LEGACY_SUCCESS] [TRACE={trace_id}] Deleted legacy share link={share_id} from database")
    return {"deleted": True}

