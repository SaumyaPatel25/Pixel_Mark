from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.core import SubscriptionModel, Project, OrgMember, Organization

import logging
logger = logging.getLogger("stage.services.plan_capabilities")

# In-memory plan resolution cache with 45s TTL per org
_PLAN_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 45


class PlanCapabilities:
    """
    Single source of truth for STAGE subscription plan capabilities and limits.
    """

    @staticmethod
    def get_capabilities(plan_type: str, status: str, past_due_since: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Returns capabilities dict for a plan type and status.
        Handles past_due 3-day grace period with warning banner before downgrade enforcement.
        """
        now = datetime.now(timezone.utc)
        is_past_due_warning = False
        grace_period_ends_at = None

        if status == "past_due":
            since = past_due_since or now
            if since.tzinfo is None:
                since = since.replace(tzinfo=timezone.utc)
            grace_period_ends_at = since + timedelta(days=3)
            if now < grace_period_ends_at:
                is_past_due_warning = True
            else:
                # Grace period expired -> treat as none / canceled
                status = "canceled"

        if status in ("canceled", "incomplete", "expired", "none") or plan_type == "none":
            return {
                "plan_type": plan_type if plan_type != "none" else "none",
                "status": status,
                "seats_allowed": 1,
                "projects_allowed": 1,
                "blueprint_dom_edit": False,
                "is_early_bird": False,
                "is_past_due_warning": is_past_due_warning,
                "grace_period_ends_at": grace_period_ends_at.isoformat() if grace_period_ends_at else None,
                "can_create_projects": True,
                "has_blueprint_dom_edit": False,
            }

        is_early_bird = (plan_type == "dev_team_early_bird")

        if plan_type == "stage_team":
            return {
                "plan_type": "stage_team",
                "status": "active",
                "seats_allowed": 9999,
                "projects_allowed": 9999,
                "blueprint_dom_edit": True,
                "is_early_bird": False,
                "is_past_due_warning": False,
                "grace_period_ends_at": None,
                "can_create_projects": True,
                "has_blueprint_dom_edit": True,
            }
        elif plan_type in ("dev_team", "dev_team_early_bird"):
            return {
                "plan_type": plan_type,
                "status": status,
                "seats_allowed": 5,
                "projects_allowed": 10,
                "blueprint_dom_edit": True,
                "is_early_bird": is_early_bird,
                "is_past_due_warning": is_past_due_warning,
                "grace_period_ends_at": grace_period_ends_at.isoformat() if grace_period_ends_at else None,
                "can_create_projects": True,
                "has_blueprint_dom_edit": True,
            }
        elif plan_type == "enterprise":
            return {
                "plan_type": "enterprise",
                "status": status,
                "seats_allowed": 9999,
                "projects_allowed": 9999,
                "blueprint_dom_edit": True,
                "is_early_bird": False,
                "is_past_due_warning": is_past_due_warning,
                "grace_period_ends_at": grace_period_ends_at.isoformat() if grace_period_ends_at else None,
                "can_create_projects": True,
                "has_blueprint_dom_edit": True,
            }
        else:  # none / fallback
            if plan_type not in ("none", "free"):
                logger.error(f"[STAGE Resolver Warning] Unrecognized plan value '{plan_type}' reached capabilities resolver. Defaulting to free/none limits.")
            return {
                "plan_type": "none",
                "status": status,
                "seats_allowed": 1,
                "projects_allowed": 1,
                "blueprint_dom_edit": False,
                "is_early_bird": False,
                "is_past_due_warning": is_past_due_warning,
                "grace_period_ends_at": grace_period_ends_at.isoformat() if grace_period_ends_at else None,
                "can_create_projects": True,
                "has_blueprint_dom_edit": False,
            }

    @staticmethod
    async def sync_org_project_status(org_id: str, projects_allowed: int, db: AsyncSession) -> None:
        """
        Handles downgrade edge case: archives excess projects as 'archived_over_limit' without deleting data.
        Keeps oldest/first `projects_allowed` active.
        """
        res = await db.execute(
            select(Project)
            .where(Project.org_id == org_id)
            .order_by(Project.created_at.asc())
        )
        all_projects = res.scalars().all()
        active_count = 0
        changed = False

        for p in all_projects:
            if active_count < projects_allowed:
                if p.status == "archived_over_limit":
                    p.status = "active"
                    changed = True
                active_count += 1
            else:
                if p.status != "archived_over_limit":
                    p.status = "archived_over_limit"
                    changed = True

        if changed:
            await db.commit()


def invalidate_org_plan_cache(org_id: str) -> None:
    """
    Invalidates cached org plan resolution immediately on webhook / subscription state change.
    """
    _PLAN_CACHE.pop(org_id, None)


async def resolve_org_plan(org_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Resolves an organization's active plan with 45s TTL cache and live usage counts.
    """
    now_ts = datetime.now(timezone.utc).timestamp()
    cached = _PLAN_CACHE.get(org_id)
    if cached and (now_ts - cached["_cached_at"]) < CACHE_TTL_SECONDS:
        return cached["data"]

    # Fetch Org to check if internal QA organization
    org_res = await db.execute(select(Organization).where(Organization.id == org_id))
    org_obj = org_res.scalar_one_or_none()
    is_internal_org = bool(org_obj and getattr(org_obj, "is_internal", False))

    if is_internal_org:
        caps = PlanCapabilities.get_capabilities(plan_type="stage_team", status="active")
    else:
        # Fetch Subscription
        sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = sub_res.scalar_one_or_none()

        if not sub:
            # Edge Case 1: No subscription yet
            caps = PlanCapabilities.get_capabilities(plan_type="none", status="none")
        else:
            past_due_since = getattr(sub, "past_due_since", None)
            caps = PlanCapabilities.get_capabilities(
                plan_type=sub.plan_type,
                status=sub.status,
                past_due_since=past_due_since
            )

    # Sync over-limit projects if needed
    await PlanCapabilities.sync_org_project_status(org_id, caps["projects_allowed"], db)

    # Count projects toward plan capacity (active + archived + soft_deleted within 30-day retention window)
    retention_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    proj_res = await db.execute(
        select(func.count(Project.id))
        .where(Project.org_id == org_id)
        .where(
            (Project.status.in_(["active", "archived", "archived_over_limit"]))
            | (
                (Project.status == "soft_deleted")
                & (Project.soft_deleted_at != None)
                & (Project.soft_deleted_at > retention_cutoff)
            )
        )
    )
    projects_used = proj_res.scalar() or 0

    # Count seats
    seat_res = await db.execute(
        select(func.count(OrgMember.id)).where(OrgMember.org_id == org_id)
    )
    seats_used = seat_res.scalar() or 0

    projects_remaining = max(0, caps["projects_allowed"] - projects_used)
    seats_remaining = max(0, caps["seats_allowed"] - seats_used)

    res_data = {
        "org_id": org_id,
        "plan_type": caps["plan_type"],
        "status": caps["status"],
        "seats_allowed": caps["seats_allowed"],
        "projects_allowed": caps["projects_allowed"],
        "has_blueprint_dom_edit": caps["has_blueprint_dom_edit"],
        "is_early_bird": caps["is_early_bird"],
        "is_past_due_warning": caps["is_past_due_warning"],
        "grace_period_ends_at": caps["grace_period_ends_at"],
        "projects_used": projects_used,
        "seats_used": seats_used,
        "projects_remaining": projects_remaining,
        "seats_remaining": seats_remaining,
        "can_create_projects": (projects_used < caps["projects_allowed"]) if caps["projects_allowed"] > 0 else False,
    }

    _PLAN_CACHE[org_id] = {
        "_cached_at": now_ts,
        "data": res_data
    }
    return res_data


async def resolve_org_entitlements(user_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Centralized entitlement resolution for a user.
    Resolves org membership, role, subscription status, seat counts, and Blueprint DOM access.
    """
    res = await db.execute(select(OrgMember).where(OrgMember.user_id == user_id))
    member = res.scalars().first()
    if not member:
        return {
            "user_id": user_id,
            "org_id": None,
            "org_name": "No Organization",
            "role": "guest",
            "is_billing_owner": False,
            "plan_type": "none",
            "status": "none",
            "seats_allowed": 1,
            "seats_used": 1,
            "seats_remaining": 0,
            "projects_allowed": 1,
            "projects_used": 0,
            "projects_remaining": 1,
            "has_blueprint_dom_edit": False,
            "can_use_blueprint_dom": False,
            "is_paid": False,
            "is_early_bird": False,
            "is_test_mode": True,
        }

    org_id = member.org_id
    plan_info = await resolve_org_plan(org_id, db)
    
    org_res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_res.scalar_one_or_none()
    org_name = org.name if org else "My Organization"

    role_str = member.role.value if hasattr(member.role, "value") else str(member.role)
    is_billing_owner = (role_str in ("billing_owner", "owner"))

    is_paid = (
        plan_info["plan_type"] in ("stage_team", "dev_team", "dev_team_early_bird", "enterprise")
        and plan_info["status"] in ("active", "trialing")
        and plan_info["seats_used"] <= plan_info["seats_allowed"]
    )

    can_use_blueprint_dom = bool(is_paid and plan_info["has_blueprint_dom_edit"])

    # Load subscription for frontend Zustand state hydration
    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
    sub = sub_res.scalar_one_or_none()

    sub_dict = {
        "id": sub.id,
        "org_id": sub.org_id,
        "dodo_customer_id": sub.dodo_customer_id,
        "dodo_subscription_id": sub.dodo_subscription_id,
        "plan_type": sub.plan_type,
        "status": sub.status,
        "is_test_mode": sub.is_test_mode,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "seats_allowed": sub.seats_allowed,
        "projects_allowed": sub.projects_allowed,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
    } if sub else None

    return {
        "user_id": user_id,
        "org_id": org_id,
        "org_name": org_name,
        "role": role_str,
        "is_billing_owner": is_billing_owner,
        "plan_type": plan_info["plan_type"],
        "status": plan_info["status"],
        "seats_allowed": plan_info["seats_allowed"],
        "seats_used": plan_info["seats_used"],
        "seats_remaining": plan_info["seats_remaining"],
        "projects_allowed": plan_info["projects_allowed"],
        "projects_used": plan_info["projects_used"],
        "projects_remaining": plan_info["projects_remaining"],
        "has_blueprint_dom_edit": can_use_blueprint_dom,
        "can_use_blueprint_dom": can_use_blueprint_dom,
        "is_paid": is_paid,
        "is_early_bird": plan_info["is_early_bird"],
        "is_test_mode": True,
        "is_past_due_warning": plan_info["is_past_due_warning"],
        "grace_period_ends_at": plan_info["grace_period_ends_at"],
        "subscription": sub_dict,
    }

