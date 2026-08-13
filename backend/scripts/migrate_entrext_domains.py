import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import AsyncSessionLocal, engine, Base
from models import User, Organization, OrgMember, SubscriptionModel, EntitlementAuditLogModel
from services.identity_resolver import is_entrext_domain, ensure_domain_and_founder_entitlement
from sqlalchemy import select

async def run_entrext_domain_migration():
    print("==================================================")
    print("Starting One-Time Migration for @entrext.com Domain Accounts")
    print("==================================================")

    # 1. Ensure all schema columns exist (run column migrations for SQLite)
    async with engine.begin() as conn:
        from sqlalchemy import text
        for stmt in [
            "ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscriptions ADD COLUMN is_manual_override BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscriptions ADD COLUMN plan_source VARCHAR DEFAULT 'default';",
            "ALTER TABLE subscriptions ADD COLUMN is_paused BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscriptions ADD COLUMN admin_notes TEXT;"
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)

    upgraded_count = 0

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        all_users = res.scalars().all()

        print(f"Scanned {len(all_users)} total registered users in database.")

        for user in all_users:
            if not user.email:
                continue

            email_clean = user.email.strip().lower()
            if is_entrext_domain(email_clean):
                print(f"\n[FOUND @entrext.com Account]: {email_clean} (id: {user.id})")
                print(f"  Verified Status: {user.is_verified}")

                # Ensure verified for domain migration if existing account
                if not user.is_verified:
                    user.is_verified = True
                    db.add(user)
                    await db.commit()
                    print(f"  --> Marked user {email_clean} as verified for domain auto-entitlement.")

                # Get before plan
                mem_res = await db.execute(select(OrgMember).where(OrgMember.user_id == user.id))
                mems = mem_res.scalars().all()
                old_plan = "none"
                if mems:
                    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == mems[0].org_id))
                    sub = sub_res.scalar_one_or_none()
                    if sub:
                        old_plan = sub.plan_type

                print(f"  Plan BEFORE Migration: '{old_plan}'")

                # Run entitlement auto-provisioning
                await ensure_domain_and_founder_entitlement(user, db, auth_provider="migration_script")

                # Get after plan
                if mems:
                    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == mems[0].org_id))
                    sub_after = sub_res.scalar_one_or_none()
                    new_plan = sub_after.plan_type if sub_after else "unknown"
                    print(f"  Plan AFTER Migration: '{new_plan}' (source: {getattr(sub_after, 'plan_source', 'n/a')})")

                upgraded_count += 1

    print("\n==================================================")
    print(f"Migration Summary: Upgraded {upgraded_count} @entrext.com account(s) to 'stage_team'.")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_entrext_domain_migration())
