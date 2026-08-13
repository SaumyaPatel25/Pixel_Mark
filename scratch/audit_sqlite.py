import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import User, Organization, OrgMember, Project, SubscriptionModel
from sqlalchemy import select

async def main():
    engine = create_async_engine("sqlite+aiosqlite:///./test.db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        print("\n=== AUDITING LOCAL test.db ===")
        
        # 1. Projects
        p_res = await db.execute(select(Project))
        projects = p_res.scalars().all()
        print(f"Total projects in test.db: {len(projects)}")
        for p in projects:
            print(f"Project: '{p.name}' | ID: {p.id} | Org ID: {p.org_id} | Status: {getattr(p, 'status', 'active')}")

        # 2. Users
        u_res = await db.execute(select(User))
        users = u_res.scalars().all()
        print(f"\nTotal users in test.db: {len(users)}")
        for u in users:
            m_res = await db.execute(select(OrgMember).where(OrgMember.user_id == u.id))
            mems = m_res.scalars().all()
            for m in mems:
                s_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == m.org_id))
                sub = s_res.scalar_one_or_none()
                sub_plan = sub.plan_type if sub else "NO_SUB"
                print(f"User: '{u.name}' | Email: '{u.email}' | ID: {u.id} | Org: {m.org_id} | Plan: {sub_plan}")

if __name__ == "__main__":
    asyncio.run(main())
