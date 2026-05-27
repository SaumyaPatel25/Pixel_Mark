from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models import ShareLink, User
from schemas import ShareLinkCreate, ShareLinkOut, ShareLinkAccess
from dependencies import get_db, get_current_user
from auth import hash_password, verify_password
import uuid
import secrets

router = APIRouter(prefix="/shares", tags=["shares"])

@router.post("/", response_model=ShareLinkOut)
async def create_share_link(data: ShareLinkCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    token = secrets.token_urlsafe(16)
    
    password_hash = None
    if data.password:
        password_hash = hash_password(data.password)
        
    link = ShareLink(
        id=str(uuid.uuid4()), 
        session_id=data.session_id,
        token=token,
        can_comment=data.can_comment,
        password_hash=password_hash,
        expires_at=data.expires_at
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link

@router.get("/session/{session_id}", response_model=list[ShareLinkOut])
async def list_share_links(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ShareLink).where(ShareLink.session_id == session_id))
    return result.scalars().all()

@router.post("/access/{token}")
async def access_share_link(token: str, data: ShareLinkAccess, db: AsyncSession = Depends(get_db)):
    from models import Session
    from datetime import datetime
    result = await db.execute(select(ShareLink).where(ShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Invalid share link token")
        
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")
        
    if link.password_hash:
        if not data.password or not verify_password(data.password, link.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password for share link")
            
    # Get session details
    session_result = await db.execute(select(Session).where(Session.id == link.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Associated session not found")
        
    return {
        "session_id": session.id,
        "title": session.title,
        "can_comment": link.can_comment
    }

@router.delete("/{share_id}")
async def delete_share_link(share_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await db.execute(delete(ShareLink).where(ShareLink.id == share_id))
    await db.commit()
    return {"deleted": True}

