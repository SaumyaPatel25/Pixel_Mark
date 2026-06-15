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
            print(f"Email: {r['email']}, Hashed length: {len(hp)}, Hashed starts with: {hp[:10]}...")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
