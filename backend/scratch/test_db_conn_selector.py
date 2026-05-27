import asyncio
import sys
import traceback
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Force SelectorEventLoop on Windows to avoid Proactor event loop VPN/SSL socket reset bugs
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    print("Forced WindowsSelectorEventLoopPolicy", flush=True)

# URL from .env (the pooler is fine, let's use the exact original DATABASE_URL)
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_nVHq5Eu9YNUT@ep-soft-fog-apo5qj7w-pooler.c-7.us-east-1.aws.neon.tech/neondb"

async def test_conn():
    print(f"Testing connection to {DATABASE_URL} with SelectorEventLoop...", flush=True)
    try:
        engine = create_async_engine(DATABASE_URL, connect_args={"ssl": "require"})
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            row = result.fetchone()
            print("SUCCESS! Connected to Neon DB using SelectorEventLoop!", flush=True)
            print("DB Version:", row[0], flush=True)
        await engine.dispose()
    except Exception as e:
        print("Connection failed with SelectorEventLoop too!", flush=True)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_conn())
