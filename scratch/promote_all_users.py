import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database import engine, AsyncSessionLocal
from models import User
from auth import hash_password
from scripts.promote_account import promote_account
from sqlalchemy import select

EMAILS_TO_PROMOTE = [
    "saumyavishwam@gmail.com",
    "saumya@entrext.com",
    "saumyapatel25@gmail.com",
    "saumya.patel25@gmail.com",
    "saumyapatel25@github.com",
    "saumyapatel25"
]

async def promote_all():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        all_users = res.scalars().all()
        for u in all_users:
            if u.email not in EMAILS_TO_PROMOTE:
                EMAILS_TO_PROMOTE.append(u.email)

        print(f"Target emails to promote: {EMAILS_TO_PROMOTE}")

        for email in EMAILS_TO_PROMOTE:
            res_u = await db.execute(select(User).where(User.email == email))
            u = res_u.scalar_one_or_none()
            if not u:
                u_obj = User(
                    email=email,
                    name=email.split("@")[0].upper(),
                    hashed_password=hash_password("saumya123"),
                    is_verified=True
                )
                db.add(u_obj)
                await db.commit()
                print(f"[INFO] Created user {email}")

    for email in EMAILS_TO_PROMOTE:
        await promote_account(email, "stage_team", "Bulk promotion for founder accounts")

if __name__ == "__main__":
    asyncio.run(promote_all())
