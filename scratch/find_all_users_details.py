import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import AsyncSessionLocal
from models import User, Organization, OrgMember, SubscriptionModel
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print("\n=== ALL USERS IN NEON DB ===")
        for u in users:
            m_res = await db.execute(select(OrgMember).where(OrgMember.user_id == u.id))
            m = m_res.scalars().all()
            orgs_str = ", ".join([f"org={mem.org_id}(role={mem.role})" for mem in m]) if m else "NO_ORG"
            print(f"ID: {u.id} | Email: {u.email} | Name: '{u.name}' | Orgs: [{orgs_str}]")

if __name__ == "__main__":
    asyncio.run(main())
