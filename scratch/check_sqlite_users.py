import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import User, Organization, OrgMember, SubscriptionModel
from sqlalchemy import select

async def main():
    engine = create_async_engine("sqlite+aiosqlite:///./test.db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print("\n=== ALL USERS IN LOCAL test.db ===")
        for u in users:
            m_res = await db.execute(select(OrgMember).where(OrgMember.user_id == u.id))
            m = m_res.scalars().all()
            orgs_str = ", ".join([f"org={mem.org_id}(role={mem.role})" for mem in m]) if m else "NO_ORG"
            s_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == m[0].org_id)) if m else None
            sub = s_res.scalar_one_or_none() if s_res else None
            plan = sub.plan_type if sub else "NO_SUB"
            print(f"ID: {u.id} | Email: {u.email} | Name: '{u.name}' | Plan: {plan} | Orgs: [{orgs_str}]")

if __name__ == "__main__":
    asyncio.run(main())
