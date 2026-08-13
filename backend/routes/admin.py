from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from database import AsyncSessionLocal
from dependencies import get_db, get_current_user
from models import (
    User, Organization, OrgMember, SubscriptionModel,
    EntitlementAuditLogModel, RedemptionCodeModel, RedemptionCodeUseModel, Project
)
from config import settings
from services.identity_resolver import _get_founder_emails, is_entrext_domain
from services.plan_capabilities import invalidate_org_plan_cache, resolve_org_entitlements
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin_owner(current_user: User = Depends(get_current_user)) -> User:
    """
    Strict server-side access control dependency.
    Guarantees only owner/super-admin users can access admin routes.
    """
    if not current_user or not current_user.email:
        raise HTTPException(status_code=403, detail="Forbidden: Authentication required.")

    email_clean = current_user.email.strip().lower()
    founder_emails = _get_founder_emails()
    owner_email_clean = (settings.owner_email or "").strip().lower()

    is_owner = (
        email_clean == owner_email_clean or
        email_clean in founder_emails or
        getattr(current_user, "is_super_admin", False) is True
    )

    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only workspace owners and super-admins can access this endpoint."
        )

    return current_user


def verify_owner_access(user: User) -> None:
    """
    Checks if a user is a workspace owner or super-admin, raising a 403 HTTPException if not.
    """
    if not user or not user.email:
        raise HTTPException(status_code=403, detail="Forbidden: Authentication required.")

    email_clean = user.email.strip().lower()
    founder_emails = _get_founder_emails()
    owner_email_clean = (settings.owner_email or "").strip().lower()

    is_owner = (
        email_clean == owner_email_clean or
        email_clean in founder_emails or
        getattr(user, "is_super_admin", False) is True
    )

    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only workspace owners and super-admins can perform this action."
        )


# Schemas
class OverridePlanRequest(BaseModel):
    target_user_id: Optional[str] = None
    target_org_id: Optional[str] = None
    new_plan: str
    is_manual_override: bool = True
    notes: Optional[str] = None

class TogglePauseRequest(BaseModel):
    target_org_id: str
    is_paused: bool
    notes: Optional[str] = None


@router.get("/users")
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_owner)
):
    """
    Returns a unified admin view of all registered users, their canonical identities,
    organizations, live subscription metrics, plan sources, and manual override status.
    """
    # Fetch all users with identities and org memberships
    users_res = await db.execute(
        select(User)
        .options(selectinload(User.identities), selectinload(User.org_memberships))
        .order_by(desc(User.created_at))
    )
    users = users_res.scalars().all()

    user_list = []
    for u in users:
        # Resolve org
        org_id = None
        org_name = None
        is_internal = False
        role = "member"

        if u.org_memberships:
            mem = u.org_memberships[0]
            org_id = mem.org_id
            role = mem.role.value if hasattr(mem.role, "value") else str(mem.role)

            org_res = await db.execute(select(Organization).where(Organization.id == org_id))
            org = org_res.scalar_one_or_none()
            if org:
                org_name = org.name
                is_internal = org.is_internal

        # Resolve subscription
        sub_info = None
        projects_count = 0
        if org_id:
            sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                sub_info = {
                    "id": sub.id,
                    "plan_type": sub.plan_type,
                    "status": sub.status,
                    "plan_source": getattr(sub, "plan_source", "default"),
                    "is_manual_override": getattr(sub, "is_manual_override", False),
                    "is_paused": getattr(sub, "is_paused", False),
                    "seats_allowed": sub.seats_allowed,
                    "projects_allowed": sub.projects_allowed,
                    "dodo_customer_id": sub.dodo_customer_id,
                    "dodo_subscription_id": sub.dodo_subscription_id,
                    "admin_notes": getattr(sub, "admin_notes", None)
                }

            proj_count_res = await db.execute(select(func.count(Project.id)).where(Project.org_id == org_id))
            projects_count = proj_count_res.scalar() or 0

        # Identity providers list
        providers = [id_obj.provider for id_obj in (u.identities or [])]
        if not providers:
            providers = ["email_password"]

        user_list.append({
            "user_id": u.id,
            "email": u.email,
            "name": u.name,
            "is_verified": u.is_verified,
            "is_super_admin": getattr(u, "is_super_admin", False),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "auth_providers": providers,
            "org_id": org_id,
            "org_name": org_name,
            "role": role,
            "is_internal": is_internal,
            "subscription": sub_info,
            "projects_count": projects_count,
            "is_entrext_domain": is_entrext_domain(u.email)
        })

    return {"users": user_list, "total_count": len(user_list)}


@router.post("/override-plan")
async def admin_override_plan(
    req: OverridePlanRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_owner)
):
    """
    Manually overrides an organization/user's subscription plan.
    Marks is_manual_override = True so Dodo webhooks do NOT overwrite the decision.
    """
    target_org_id = req.target_org_id
    target_user_id = req.target_user_id

    if not target_org_id and target_user_id:
        mem_res = await db.execute(select(OrgMember).where(OrgMember.user_id == target_user_id))
        mem = mem_res.scalars().first()
        if mem:
            target_org_id = mem.org_id

    if not target_org_id:
        raise HTTPException(status_code=400, detail="Target organization ID or valid user ID required.")

    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == target_org_id))
    sub = sub_res.scalar_one_or_none()

    if not sub:
        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=target_org_id,
            plan_type="none",
            status="none",
            is_test_mode=True
        )
        db.add(sub)
        await db.flush()

    old_plan = sub.plan_type
    normalized_plan = req.new_plan.strip().lower()

    sub.plan_type = normalized_plan
    sub.status = "active" if normalized_plan in ("stage_team", "dev_team", "dev_team_early_bird", "enterprise") else "none"
    sub.is_manual_override = req.is_manual_override
    sub.plan_source = "manual_override" if req.is_manual_override else "default"
    sub.admin_notes = req.notes

    if normalized_plan in ("stage_team", "enterprise"):
        sub.seats_allowed = 9999
        sub.projects_allowed = 9999
    elif normalized_plan in ("dev_team", "dev_team_early_bird"):
        sub.seats_allowed = 5
        sub.projects_allowed = 10
    else:
        sub.seats_allowed = 1
        sub.projects_allowed = 1

    # Also mark organization internal if stage_team
    if normalized_plan == "stage_team":
        org_res = await db.execute(select(Organization).where(Organization.id == target_org_id))
        org = org_res.scalar_one_or_none()
        if org:
            org.is_internal = True
            db.add(org)

    # Audit log
    audit_log = EntitlementAuditLogModel(
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        target_org_id=target_org_id,
        target_user_id=target_user_id,
        old_tier=old_plan,
        new_tier=normalized_plan,
        reason=f"Admin Manual Override (is_manual_override={req.is_manual_override}): {req.notes or 'No reason provided'}"
    )
    db.add(audit_log)
    await db.commit()

    invalidate_org_plan_cache(target_org_id)
    return {
        "success": True,
        "message": f"Successfully updated org {target_org_id} plan to '{normalized_plan}'",
        "org_id": target_org_id,
        "plan_type": normalized_plan,
        "is_manual_override": sub.is_manual_override
    }


@router.post("/toggle-pause")
async def admin_toggle_pause(
    req: TogglePauseRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_owner)
):
    """
    Pauses or reactivates an organization's access.
    """
    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == req.target_org_id))
    sub = sub_res.scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record not found for org.")

    sub.is_paused = req.is_paused
    db.add(sub)

    audit_log = EntitlementAuditLogModel(
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        target_org_id=req.target_org_id,
        target_user_id=None,
        old_tier=sub.plan_type,
        new_tier=f"{sub.plan_type} (paused={req.is_paused})",
        reason=f"Admin Pause Toggle: {req.notes or 'No reason provided'}"
    )
    db.add(audit_log)
    await db.commit()

    invalidate_org_plan_cache(req.target_org_id)
    return {
        "success": True,
        "org_id": req.target_org_id,
        "is_paused": sub.is_paused
    }


@router.get("/audit-logs")
async def list_admin_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_owner)
):
    """
    Returns history of entitlement changes and admin actions.
    """
    res = await db.execute(
        select(EntitlementAuditLogModel)
        .order_by(desc(EntitlementAuditLogModel.created_at))
        .limit(limit)
    )
    logs = res.scalars().all()

    return {
        "logs": [
            {
                "id": l.id,
                "actor_id": l.actor_id,
                "actor_email": l.actor_email,
                "target_org_id": l.target_org_id,
                "target_user_id": l.target_user_id,
                "old_tier": l.old_tier,
                "new_tier": l.new_tier,
                "reason": l.reason,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]
    }


@router.get("/redemptions")
async def list_admin_redemptions(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_owner)
):
    """
    Lists generated redemption codes and their usage records.
    """
    codes_res = await db.execute(select(RedemptionCodeModel).order_by(desc(RedemptionCodeModel.created_at)))
    codes = codes_res.scalars().all()

    uses_res = await db.execute(select(RedemptionCodeUseModel).order_by(desc(RedemptionCodeUseModel.redeemed_at)))
    uses = uses_res.scalars().all()

    return {
        "codes": [
            {
                "id": c.id,
                "code": c.code,
                "plan": c.plan,
                "max_uses": c.max_uses,
                "uses_count": c.uses_count,
                "is_active": c.is_active,
                "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                "created_by": c.created_by,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "notes": c.notes
            }
            for c in codes
        ],
        "uses": [
            {
                "id": u.id,
                "code_id": u.code_id,
                "redeemed_by_user_id": u.redeemed_by_user_id,
                "redeemed_by_org_id": u.redeemed_by_org_id,
                "previous_plan": u.previous_plan,
                "new_plan": u.new_plan,
                "redeemed_at": u.redeemed_at.isoformat() if u.redeemed_at else None
            }
            for u in uses
        ]
    }


class PromoteEntitlementRequest(BaseModel):
    target_email: str
    new_tier: str
    reason: Optional[str] = None


async def promote_account_tier(
    req: PromoteEntitlementRequest,
    current_user: User,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Compatibility shim for older test suites. Writes the audit log reason exactly as expected.
    """
    await require_admin_owner(current_user)

    res_user = await db.execute(select(User).where(User.email == req.target_email.strip().lower()))
    target_user = res_user.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    from routes.billing import resolve_user_org_id
    target_org_id = await resolve_user_org_id(db, target_user)

    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == target_org_id))
    sub = sub_res.scalar_one_or_none()

    if not sub:
        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=target_org_id,
            plan_type="none",
            status="none",
            is_test_mode=True
        )
        db.add(sub)
        await db.flush()

    old_plan = sub.plan_type
    normalized_plan = req.new_tier.strip().lower()

    sub.plan_type = normalized_plan
    sub.status = "active" if normalized_plan in ("stage_team", "dev_team", "dev_team_early_bird", "enterprise") else "none"
    sub.is_manual_override = True
    sub.plan_source = "manual_override"
    sub.admin_notes = req.reason

    if normalized_plan in ("stage_team", "enterprise"):
        sub.seats_allowed = 9999
        sub.projects_allowed = 9999
    elif normalized_plan in ("dev_team", "dev_team_early_bird"):
        sub.seats_allowed = 5
        sub.projects_allowed = 10
    else:
        sub.seats_allowed = 1
        sub.projects_allowed = 1

    if normalized_plan == "stage_team":
        org_res = await db.execute(select(Organization).where(Organization.id == target_org_id))
        org = org_res.scalar_one_or_none()
        if org:
            org.is_internal = True
            db.add(org)

    audit_log = EntitlementAuditLogModel(
        actor_id=current_user.id,
        actor_email=current_user.email,
        target_org_id=target_org_id,
        target_user_id=target_user.id,
        old_tier=old_plan,
        new_tier=normalized_plan,
        reason=req.reason
    )
    db.add(audit_log)
    await db.commit()

    invalidate_org_plan_cache(target_org_id)
    return {
        "success": True,
        "new_tier": req.new_tier,
        "message": f"Successfully updated subscription to {req.new_tier}"
    }
