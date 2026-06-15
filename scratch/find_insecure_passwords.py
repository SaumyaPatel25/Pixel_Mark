import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    url = DATABASE_URL.split("?")[0]
    conn = await asyncpg.connect(url, ssl="require")
    try:
        rows = await conn.fetch("SELECT email, hashed_password FROM users")
        for r in rows:
            hp = r['hashed_password']
            if not (hp.startswith("$argon2") or hp.startswith("$2b$")):
                print(f"FAILED USER email: {r['email']}, hashed_password: {repr(hp)}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
