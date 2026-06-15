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
        deleted = await conn.execute("DELETE FROM users WHERE hashed_password = '...'")
        print(f"Result: {deleted}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
