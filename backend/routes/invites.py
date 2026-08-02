from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import hashlib

from models import User, Organization, OrgMember, OrgInvite, RoleEnum
from dependencies import get_db, get_current_user
from services.plan_capabilities import resolve_org_plan, invalidate_org_plan_cache

router = APIRouter(prefix="/orgs/invites", tags=["Organization Invites"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

class CreateInviteRequest(BaseModel):
    role: str = "developer"
    max_uses: Optional[int] = None
    expires_in_days: Optional[int] = 7
    password: Optional[str] = None

class InviteOut(BaseModel):
    id: str
    org_id: str
    org_name: str
    role: str
    max_uses: int
    current_use_count: int
    expires_at: Optional[datetime] = None
    has_password: bool
    is_revoked: bool
    created_at: datetime

class InvitePreviewOut(BaseModel):
    invite_id: str
    org_id: str
    org_name: str
    role: str
    seats_remaining: int
    is_expired: bool
    is_revoked: bool
    is_full: bool
    requires_password: bool

class JoinInviteRequest(BaseModel):
    password: Optional[str] = None


@router.post("", response_model=InviteOut)
async def create_invite_link(
    req: CreateInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find caller's primary organization membership
    res = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Organization membership not found.")

    role_str = member.role.value if hasattr(member.role, "value") else str(member.role)
    if role_str not in ("billing_owner", "owner", "admin"):
        raise HTTPException(status_code=403, detail="Only billing owners and admins can create invite links.")

    requested_role = req.role or "developer"
    valid_roles = {"owner", "billing_owner", "admin", "developer", "member", "guest"}
    if requested_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid invite role '{requested_role}'. Must be one of: {list(valid_roles)}"
        )

    # Enforce privilege hierarchy: Only owners/billing_owners can invite admins/owners
    if requested_role in ("owner", "billing_owner", "admin") and role_str not in ("owner", "billing_owner"):
        raise HTTPException(
            status_code=403,
            detail="Only organization owners can create admin or owner invitations."
        )

    plan_info = await resolve_org_plan(member.org_id, db)
    seats_remaining = plan_info["seats_remaining"]
    if seats_remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail="Team is full. Developer seat limit reached for your plan."
        )

    # Capped max uses by remaining seats
    max_uses = req.max_uses if req.max_uses and req.max_uses > 0 else seats_remaining
    max_uses = min(max_uses, seats_remaining)

    expires_at = None
    if req.expires_in_days and req.expires_in_days > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)

    password_hash = hash_password(req.password) if req.password else None

    invite = OrgInvite(
        org_id=member.org_id,
        role=req.role or "developer",
        max_uses=max_uses,
        current_use_count=0,
        expires_at=expires_at,
        password_hash=password_hash,
        created_by=current_user.id
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    org_res = await db.execute(select(Organization).where(Organization.id == member.org_id))
    org = org_res.scalar_one_or_none()
    org_name = org.name if org else "My Organization"

    return InviteOut(
        id=invite.id,
        org_id=invite.org_id,
        org_name=org_name,
        role=invite.role,
        max_uses=invite.max_uses,
        current_use_count=invite.current_use_count,
        expires_at=invite.expires_at,
        has_password=bool(invite.password_hash),
        is_revoked=bool(invite.revoked_at),
        created_at=invite.created_at
    )


@router.get("", response_model=List[InviteOut])
async def list_org_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = res.scalars().first()
    if not member:
        return []

    org_res = await db.execute(select(Organization).where(Organization.id == member.org_id))
    org = org_res.scalar_one_or_none()
    org_name = org.name if org else "My Organization"

    inv_res = await db.execute(
        select(OrgInvite)
        .where(OrgInvite.org_id == member.org_id)
        .order_by(OrgInvite.created_at.desc())
    )
    invites = inv_res.scalars().all()

    return [
        InviteOut(
            id=inv.id,
            org_id=inv.org_id,
            org_name=org_name,
            role=inv.role,
            max_uses=inv.max_uses,
            current_use_count=inv.current_use_count,
            expires_at=inv.expires_at,
            has_password=bool(inv.password_hash),
            is_revoked=bool(inv.revoked_at),
            created_at=inv.created_at
        )
        for inv in invites
    ]


@router.delete("/{invite_id}")
async def revoke_invite_link(
    invite_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Organization membership not found.")

    role_str = member.role.value if hasattr(member.role, "value") else str(member.role)
    if role_str not in ("billing_owner", "owner", "admin"):
        raise HTTPException(status_code=403, detail="Only billing owners and admins can revoke invite links.")

    inv_res = await db.execute(
        select(OrgInvite)
        .where(OrgInvite.id == invite_id, OrgInvite.org_id == member.org_id)
    )
    invite = inv_res.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link not found.")

    invite.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Invite link revoked successfully."}


@router.get("/{invite_id}/preview", response_model=InvitePreviewOut)
async def preview_invite_link(
    invite_id: str,
    db: AsyncSession = Depends(get_db)
):
    inv_res = await db.execute(select(OrgInvite).where(OrgInvite.id == invite_id))
    invite = inv_res.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link.")

    org_res = await db.execute(select(Organization).where(Organization.id == invite.org_id))
    org = org_res.scalar_one_or_none()
    org_name = org.name if org else "STAGE Team"

    plan_info = await resolve_org_plan(invite.org_id, db)
    seats_remaining = plan_info["seats_remaining"]

    now = datetime.now(timezone.utc)
    is_expired = bool(invite.expires_at and invite.expires_at < now)
    is_revoked = bool(invite.revoked_at)
    is_full = bool(seats_remaining <= 0 or invite.current_use_count >= invite.max_uses)

    return InvitePreviewOut(
        invite_id=invite.id,
        org_id=invite.org_id,
        org_name=org_name,
        role=invite.role,
        seats_remaining=seats_remaining,
        is_expired=is_expired,
        is_revoked=is_revoked,
        is_full=is_full,
        requires_password=bool(invite.password_hash)
    )


@router.post("/{invite_id}/join")
async def join_org_via_invite(
    invite_id: str,
    req: JoinInviteRequest = JoinInviteRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    inv_res = await db.execute(select(OrgInvite).where(OrgInvite.id == invite_id))
    invite = inv_res.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite link.")

    if invite.revoked_at:
        raise HTTPException(status_code=400, detail="This invite link has been revoked by the team admin.")

    now = datetime.now(timezone.utc)
    if invite.expires_at and invite.expires_at < now:
        raise HTTPException(status_code=400, detail="This invite link has expired.")

    if invite.current_use_count >= invite.max_uses:
        raise HTTPException(status_code=400, detail="Team is full. Max uses reached for this invite link.")

    if invite.password_hash:
        if not req.password or hash_password(req.password) != invite.password_hash:
            raise HTTPException(status_code=401, detail="Incorrect password for this invite link.")

    plan_info = await resolve_org_plan(invite.org_id, db)
    if plan_info["seats_used"] >= plan_info["seats_allowed"]:
        raise HTTPException(status_code=400, detail="Team is full. Seat limit reached for this organization.")

    # Check existing membership
    mem_res = await db.execute(
        select(OrgMember).where(OrgMember.user_id == current_user.id)
    )
    existing_member = mem_res.scalars().first()

    role_val = RoleEnum.member
    if invite.role in ("billing_owner", "owner"):
        role_val = RoleEnum.owner
    elif invite.role == "admin":
        role_val = RoleEnum.admin

    if existing_member:
        existing_member.org_id = invite.org_id
        existing_member.role = role_val
    else:
        new_member = OrgMember(
            org_id=invite.org_id,
            user_id=current_user.id,
            role=role_val
        )
        db.add(new_member)

    # Increment use count atomically
    invite.current_use_count += 1

    await db.commit()
    invalidate_org_plan_cache(invite.org_id)

    return {
        "status": "joined",
        "org_id": invite.org_id,
        "role": invite.role,
        "message": f"Successfully joined organization as {invite.role}."
    }
