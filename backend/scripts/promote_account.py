"""
STAGE Internal Entitlement Promotion CLI
Promotes a user account / organization to stage_team or another specified tier with full audit logging.

Usage:
    python -m scripts.promote_account --email saumyavishwam@gmail.com --tier stage_team --reason "Owner promotion"
"""

import sys
import asyncio
import argparse
from pathlib import Path

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import AsyncSessionLocal
from models import User, Organization, OrgMember, SubscriptionModel, EntitlementAuditLogModel
from services.plan_capabilities import invalidate_org_plan_cache, resolve_org_plan
from routes.billing import resolve_user_org_id
from sqlalchemy import select


async def promote_account(email: str, new_tier: str = "stage_team", reason: str = "CLI owner promotion", actor_email: str = "system_cli"):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        if not user:
            print(f"[ERROR] User with email '{email}' not found.")
            return False

        org_id = await resolve_user_org_id(db, user)

        sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = sub_res.scalar_one_or_none()

        if not sub:
            sub = SubscriptionModel(
                org_id=org_id,
                plan_type="none",
                status="none",
                seats_allowed=1,
                projects_allowed=1
            )
            db.add(sub)
            await db.flush()

        old_tier = sub.plan_type
        sub.plan_type = new_tier
        sub.status = "active" if new_tier in ("stage_team", "dev_team", "enterprise") else "none"

        if new_tier in ("stage_team", "enterprise"):
            sub.seats_allowed = 9999
            sub.projects_allowed = 9999
        elif new_tier in ("dev_team", "dev_team_early_bird"):
            sub.seats_allowed = 5
            sub.projects_allowed = 10
        else:
            sub.seats_allowed = 1
            sub.projects_allowed = 1

        org_res = await db.execute(select(Organization).where(Organization.id == org_id))
        org_obj = org_res.scalar_one_or_none()
        if org_obj and new_tier == "stage_team":
            org_obj.is_internal = True

        audit_log = EntitlementAuditLogModel(
            actor_id="cli_admin",
            actor_email=actor_email,
            target_org_id=org_id,
            target_user_id=user.id,
            old_tier=old_tier,
            new_tier=new_tier,
            reason=reason
        )
        db.add(audit_log)
        await db.commit()

        invalidate_org_plan_cache(org_id)
        plan_info = await resolve_org_plan(org_id, db)

        print(f"[SUCCESS] Successfully promoted '{email}' (User ID: {user.id}, Org ID: {org_id})")
        print(f"  Previous Tier: {old_tier}")
        print(f"  New Tier:      {new_tier}")
        print(f"  Capabilities:  {plan_info}")
        return True


def main():
    parser = argparse.ArgumentParser(description="Promote a STAGE account to an internal entitlement tier.")
    parser.add_argument("--email", required=True, help="User email address to promote")
    parser.add_argument("--tier", default="stage_team", help="Target entitlement tier (default: stage_team)")
    parser.add_argument("--reason", default="CLI Owner promotion", help="Audit log reason")
    args = parser.parse_args()

    asyncio.run(promote_account(email=args.email, new_tier=args.tier, reason=args.reason))


if __name__ == "__main__":
    main()
