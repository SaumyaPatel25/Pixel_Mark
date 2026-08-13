import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import AsyncSessionLocal
from models import User, UserIdentity
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(UserIdentity))
        providers = res.scalars().all()
        print("\n=== ALL USER IDENTITIES IN NEON DB ===")
        for p in providers:
            print(f"ID: {p.id} | User ID: {p.user_id} | Provider: {p.provider} | Provider Email: {p.provider_email}")

        res_u = await db.execute(select(User))
        print("\n=== ALL USERS ===")
        for u in res_u.scalars().all():
            print(f"User ID: {u.id} | Email: {u.email} | Name: {u.name}")

if __name__ == "__main__":
    asyncio.run(main())
