import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import engine, Base, AsyncSessionLocal
from models import User, Organization, OrgMember, Project, SubscriptionModel
from services.plan_capabilities import PlanCapabilities, resolve_org_plan, resolve_org_entitlements, invalidate_org_plan_cache
from dependencies import check_project_limit, require_plan_feature
from auth import hash_password
from scripts.promote_account import promote_account
from sqlalchemy import select
import uuid

async def verify_and_promote():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"\n=======================================================")
        print(f"VERIFYING & PROMOTING ALL {len(users)} USERS IN LOCAL test.db")
        print(f"=======================================================")
        
        for u in users:
            # Check or create org membership
            m_res = await db.execute(select(OrgMember).where(OrgMember.user_id == u.id))
            mem = m_res.scalar_one_or_none()
            if not mem:
                org = Organization(
                    id=str(uuid.uuid4()),
                    name=f"{u.name or u.email}'s workspace",
                    slug=str(uuid.uuid4())[:8],
                    is_internal=True
                )
                db.add(org)
                await db.flush()
                mem = OrgMember(id=str(uuid.uuid4()), org_id=org.id, user_id=u.id, role="owner")
                db.add(mem)
                await db.commit()
                print(f"[+] Created org {org.id} for user {u.email}")
            
            # Promote to stage_team
            await promote_account(u.email, "stage_team", "Full verification promotion")
            
            # Resolve entitlements
            invalidate_org_plan_cache(mem.org_id)
            plan_info = await resolve_org_plan(mem.org_id, db)
            entitlements = await resolve_org_entitlements(u.id, db)
            
            print(f"\n[USER AUDIT] User: {u.email} (ID: {u.id})")
            print(f"  Org ID:               {mem.org_id}")
            print(f"  Plan Type:            {plan_info['plan_type']}")
            print(f"  Status:               {plan_info['status']}")
            print(f"  Projects Allowed:     {plan_info['projects_allowed']}")
            print(f"  Seats Allowed:        {plan_info['seats_allowed']}")
            print(f"  Can Create Projects:  {plan_info['can_create_projects']}")
            print(f"  Is Paid:              {entitlements['is_paid']}")
            print(f"  Has Blueprint DOM:    {entitlements['can_use_blueprint_dom']}")
            
            # Test project creation limit check
            await check_project_limit(mem.org_id, db)
            print(f"  check_project_limit: PASSED (No 403 error)")

if __name__ == "__main__":
    asyncio.run(verify_and_promote())
