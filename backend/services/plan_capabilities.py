from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.core import SubscriptionModel, Project, OrgMember

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
                "projects_allowed": 0,  # 0 new allowed
                "blueprint_dom_edit": False,
                "is_early_bird": False,
                "is_past_due_warning": is_past_due_warning,
                "grace_period_ends_at": grace_period_ends_at.isoformat() if grace_period_ends_at else None,
                "can_create_projects": False,
                "has_blueprint_dom_edit": False,
            }

        is_early_bird = (plan_type == "dev_team_early_bird")

        if plan_type in ("dev_team", "dev_team_early_bird"):
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
            return {
                "plan_type": "none",
                "status": status,
                "seats_allowed": 1,
                "projects_allowed": 0,  # 0 new allowed
                "blueprint_dom_edit": False,
                "is_early_bird": False,
                "is_past_due_warning": is_past_due_warning,
                "grace_period_ends_at": grace_period_ends_at.isoformat() if grace_period_ends_at else None,
                "can_create_projects": False,
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

    # Count active non-archived projects
    proj_res = await db.execute(
        select(func.count(Project.id))
        .where(Project.org_id == org_id)
        .where(Project.status != "archived_over_limit")
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
