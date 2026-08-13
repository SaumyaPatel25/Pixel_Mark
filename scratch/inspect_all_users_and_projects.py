import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import AsyncSessionLocal
from models import User, Organization, OrgMember, Project, SubscriptionModel
from services.plan_capabilities import resolve_org_plan, resolve_org_entitlements
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as db:
        print("\n=======================================================")
        print("FULL AUDIT OF ALL USERS, ORGS, SUBSCRIPTIONS & PROJECTS")
        print("=======================================================")
        
        users_res = await db.execute(select(User))
        users = users_res.scalars().all()
        print(f"Found {len(users)} users in database.\n")
        
        for u in users:
            print(f"---------------------------------------------------")
            print(f"USER: id='{u.id}', email='{u.email}', name='{u.name}'")
            
            # Memberships
            mems_res = await db.execute(select(OrgMember).where(OrgMember.user_id == u.id))
            mems = mems_res.scalars().all()
            if not mems:
                print(f"  [!] NO ORG MEMBERSHIP FOUND FOR USER {u.id}")
            for m in mems:
                org_res = await db.execute(select(Organization).where(Organization.id == m.org_id))
                org = org_res.scalar_one_or_none()
                org_name = org.name if org else "UNKNOWN"
                is_internal = getattr(org, 'is_internal', False) if org else False
                
                # Subscriptions
                sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == m.org_id))
                sub = sub_res.scalar_one_or_none()
                sub_plan = sub.plan_type if sub else "NO_SUBSCRIPTION_ROW"
                sub_status = sub.status if sub else "NO_STATUS"
                
                # Projects
                proj_res = await db.execute(select(Project).where(Project.org_id == m.org_id))
                projects = proj_res.scalars().all()
                
                # Resolve plan
                plan_info = await resolve_org_plan(m.org_id, db)
                entitlements = await resolve_org_entitlements(u.id, db)
                
                print(f"  ORG: id='{m.org_id}', name='{org_name}', is_internal={is_internal}, role='{m.role}'")
                print(f"  DB SUBSCRIPTION: plan_type='{sub_plan}', status='{sub_status}'")
                print(f"  RESOLVED PLAN INFO: plan_type='{plan_info['plan_type']}', can_create_projects={plan_info['can_create_projects']}, projects_used={plan_info['projects_used']}, projects_allowed={plan_info['projects_allowed']}")
                print(f"  RESOLVED ENTITLEMENTS: is_paid={entitlements['is_paid']}, plan_type='{entitlements['plan_type']}', can_use_blueprint_dom={entitlements['can_use_blueprint_dom']}")
                print(f"  PROJECTS ({len(projects)} total):")
                for p in projects:
                    print(f"    - Project: '{p.name}' (id={p.id}, status={getattr(p, 'status', 'active')}, url='{getattr(p, 'target_url', '')}')")

if __name__ == "__main__":
    asyncio.run(main())
