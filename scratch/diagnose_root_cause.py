import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import AsyncSessionLocal
from models import User, Organization, OrgMember, Project, SubscriptionModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def inspect_db(name: str, db_session):
    print(f"\n==========================================")
    print(f"INSPECTING {name}")
    print("==========================================")
    
    # 1. Search for projects named 'designjoy'
    p_res = await db_session.execute(select(Project).where(Project.name.ilike("%designjoy%")))
    projects = p_res.scalars().all()
    print(f"\n--- MATCHING PROJECTS ('designjoy'): {len(projects)} ---")
    for p in projects:
        print(f"\nProject ID: {p.id} | Name: '{p.name}' | Target URL: '{getattr(p, 'target_url', '')}' | Org ID: {p.org_id}")

        # Check Org
        o_res = await db_session.execute(select(Organization).where(Organization.id == p.org_id))
        org = o_res.scalar_one_or_none()
        if org:
            print(f"  --> Org ID: {org.id} | Name: '{org.name}' | is_internal: {getattr(org, 'is_internal', False)}")
            
            # Check Org Members
            m_res = await db_session.execute(select(OrgMember).where(OrgMember.org_id == org.id))
            mems = m_res.scalars().all()
            for m in mems:
                u_res = await db_session.execute(select(User).where(User.id == m.user_id))
                u = u_res.scalar_one_or_none()
                if u:
                    print(f"      --> User ID: {u.id} | Email: '{u.email}' | Name: '{u.name}'")

            # Check Subscription record for this Org
            s_res = await db_session.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org.id))
            sub = s_res.scalar_one_or_none()
            if sub:
                print(f"  --> Subscription: plan_type='{sub.plan_type}', status='{sub.status}', seats_allowed={sub.seats_allowed}, projects_allowed={sub.projects_allowed}")
            else:
                print(f"  --> NO Subscription record found for org {org.id}")

    # 2. Search all projects in this DB
    all_p_res = await db_session.execute(select(Project))
    all_p = all_p_res.scalars().all()
    print(f"\n--- ALL PROJECTS IN {name}: {len(all_p)} ---")
    for p in all_p:
        print(f"  Project: '{p.name}' (id={p.id}) | Org: {p.org_id}")

async def main():
    print("Checking Neon PostgreSQL DB...")
    async with AsyncSessionLocal() as neon_db:
        await inspect_db("NEON POSTGRESQL DB", neon_db)

    print("\nChecking Local SQLite test.db...")
    sqlite_engine = create_async_engine("sqlite+aiosqlite:///./test.db")
    sqlite_session = sessionmaker(sqlite_engine, class_=AsyncSession, expire_on_commit=False)
    async with sqlite_session() as sqlite_db:
        await inspect_db("LOCAL SQLITE test.db", sqlite_db)

if __name__ == "__main__":
    asyncio.run(main())
