import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Convert postgres:// → postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

MIGRATIONS = [
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS share_link_id VARCHAR(36);",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS page_order INTEGER DEFAULT 1;",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS first_visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1;",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS time_on_page_seconds INTEGER;",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS screenshot_captured_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS parent_page_id VARCHAR(36);",
]

async def run_migration():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL is not set. Exiting.")
        return

    print(f"[MIGRATE] Connecting to database...")
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            col_name = sql.split("ADD COLUMN IF NOT EXISTS")[1].strip().split()[0]
            try:
                await conn.execute(text(sql))
                print(f"  [OK]  {col_name}")
            except Exception as e:
                print(f"  [ERR] {col_name}: {e}")

    await engine.dispose()
    print("[MIGRATE] PageVisit table migrations complete.")

if __name__ == "__main__":
    asyncio.run(run_migration())
