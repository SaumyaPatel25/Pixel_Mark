from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ShareLink, Session, User, Project
from schemas import ShareLinkCreate, ShareLinkRead, ShareLinkPublicRead, ShareLinkAccess
from dependencies import get_db, get_current_user
from auth import hash_password, verify_password
from datetime import datetime, timezone

router = APIRouter()

@router.post("/", response_model=ShareLinkRead)
async def create_share_link(
    data: ShareLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify session exists
    session_result = await db.execute(select(Session).where(Session.id == data.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    password_hash = None
    if data.password:
        password_hash = hash_password(data.password)
    
    link = ShareLink(
        session_id=data.session_id,
        label=data.label,
        can_comment=data.can_comment,
        password_hash=password_hash,
        expires_at=data.expires_at,
        created_by=current_user.id
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link

@router.get("/session/{session_id}", response_model=list[ShareLinkRead])
async def list_share_links(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ShareLink)
        .where(ShareLink.session_id == session_id, ShareLink.is_active == True)
    )
    return result.scalars().all()

@router.delete("/{share_link_id}")
async def delete_share_link(
    share_link_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ShareLink).where(ShareLink.id == share_link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    link.is_active = False
    await db.commit()
    return {"message": "Share link deactivated successfully"}

@router.post("/resolve", response_model=ShareLinkPublicRead)
async def resolve_share_link(
    data: ShareLinkAccess,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == data.token, ShareLink.is_active == True)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or inactive")
    
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link has expired")
    
    if link.password_hash:
        if not data.password or not verify_password(data.password, link.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password")
    
    # Increment accessed_count
    link.accessed_count += 1
    await db.commit()
    
    # Get session and project info
    session_result = await db.execute(select(Session).where(Session.id == link.session_id))
    session = session_result.scalar_one_or_none()
    
    project_name = "Unknown Project"
    if session:
        project_result = await db.execute(select(Project).where(Project.id == session.project_id))
        project = project_result.scalar_one_or_none()
        if project:
            project_name = project.name
            
    return ShareLinkPublicRead(
        token=link.token,
        session_id=link.session_id,
        project_id=session.project_id if session else None,
        can_comment=link.can_comment,
        label=link.label,
        session_title=session.title if session else None,
        project_name=project_name
    )

@router.get("/{token}/info")
async def get_share_link_info(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    return {
        "label": link.label,
        "can_comment": link.can_comment,
        "is_password_protected": link.password_hash is not None
    }
