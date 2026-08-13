import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import engine, Base, AsyncSessionLocal
from models import User
from auth import hash_password
from scripts.promote_account import promote_account
from sqlalchemy import select

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "saumyavishwam@gmail.com"))
        u = res.scalar_one_or_none()
        if not u:
            u_obj = User(
                email="saumyavishwam@gmail.com",
                name="Saumya Patel",
                hashed_password=hash_password("saumya123"),
                is_verified=True
            )
            db.add(u_obj)
            await db.commit()
            print("[INFO] Created owner user saumyavishwam@gmail.com")

    await promote_account("saumyavishwam@gmail.com", "stage_team", "Owner account promotion")

if __name__ == "__main__":
    asyncio.run(main())
