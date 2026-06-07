import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, inspect

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./test.db"
else:
    # Ensure it keeps using asyncpg
    if "sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0]

print(f"Connecting to database async: {DATABASE_URL}")

connect_args = {}
if "neon.tech" in DATABASE_URL:
    connect_args = {"ssl": True}

engine = create_async_engine(DATABASE_URL, connect_args=connect_args)

async def run_migration():
    async with engine.begin() as conn:
        # Check sessions columns
        def check_sessions(sync_conn):
            inspector = inspect(sync_conn)
            return [c["name"] for c in inspector.get_columns("sessions")]
        
        session_cols = await conn.run_sync(check_sessions)
        if "conservative_render_mode" not in session_cols:
            print("Adding conservative_render_mode to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN conservative_render_mode BOOLEAN DEFAULT FALSE"))
            print("[OK] conservative_render_mode successfully added!")
        else:
            print("conservative_render_mode already exists in sessions table.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
