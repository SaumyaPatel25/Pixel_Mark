from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ShareLink, Session, User, Project, OrgMember
from schemas import ShareLinkCreate, ShareLinkRead, ShareLinkPublicRead, ShareLinkAccess
from dependencies import get_db, get_current_user
from auth import hash_password, verify_password
from datetime import datetime, timezone
from ratelimit import rate_limit

router = APIRouter()

async def verify_session_ownership(session_id: str, user_id: str, db: AsyncSession) -> None:
    res = await db.execute(select(OrgMember).where(OrgMember.user_id == user_id))
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")
    sess_res = await db.execute(
        select(Session)
        .join(Project, Session.project_id == Project.id)
        .where(Session.id == session_id, Project.org_id == member.org_id)
    )
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

@router.post("/", response_model=ShareLinkRead)
async def create_share_link(
    data: ShareLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify session exists
    await verify_session_ownership(data.session_id, current_user.id, db)
    
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
    await verify_session_ownership(session_id, current_user.id, db)
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
    
    await verify_session_ownership(link.session_id, current_user.id, db)
    
    link.is_active = False
    await db.commit()
    return {"message": "Share link deactivated successfully"}

@router.post("/resolve", response_model=ShareLinkPublicRead, dependencies=[Depends(rate_limit(30, 60))])
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
    dom_edit_available = False
    project_id = None
    if session:
        project_id = session.project_id
        project_result = await db.execute(select(Project).where(Project.id == session.project_id))
        project = project_result.scalar_one_or_none()
        if project:
            project_name = project.name
            
            # Entitlement check: Paid plan orgs allow reviewer DOM editing if flag enabled
            from services.plan_capabilities import resolve_org_plan
            plan_info = await resolve_org_plan(project.org_id, db)
            is_paid_plan = (
                plan_info["plan_type"] in ("stage_team", "dev_team", "dev_team_early_bird", "enterprise")
                and plan_info["status"] in ("active", "trialing")
            )
            dom_edit_available = bool(is_paid_plan and getattr(project, "allow_reviewer_dom_edit", True))
            
    return ShareLinkPublicRead(
        token=link.token,
        session_id=link.session_id,
        project_id=project_id,
        can_comment=link.can_comment,
        label=link.label,
        session_title=session.title if session else None,
        project_name=project_name,
        dom_edit_available=dom_edit_available
    )

@router.get("/{token}/info", dependencies=[Depends(rate_limit(30, 60))])
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
