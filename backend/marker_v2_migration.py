"""
PixelMark Step 2v2 — Marker table migration
Adds 5 new columns: issue_type, aria_label, aria_role, bounding_box, browser_info

Safe to run against an existing database — uses IF NOT EXISTS so it is idempotent.
"""

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
    # issue_type: layout | copy | interaction | navigation | rendering | canvas_webgl | other
    "ALTER TABLE markers ADD COLUMN IF NOT EXISTS issue_type VARCHAR(64) DEFAULT 'other';",

    # ARIA context for accessibility-aware reporting
    "ALTER TABLE markers ADD COLUMN IF NOT EXISTS aria_label VARCHAR(512);",
    "ALTER TABLE markers ADD COLUMN IF NOT EXISTS aria_role VARCHAR(128);",

    # Bounding box: {x, y, width, height, top, right, bottom, left}
    "ALTER TABLE markers ADD COLUMN IF NOT EXISTS bounding_box JSONB;",

    # Browser info: {name, version, os, platform, user_agent}
    "ALTER TABLE markers ADD COLUMN IF NOT EXISTS browser_info JSONB;",
]


async def run_migration():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL is not set. Exiting.")
        return

    print(f"[MIGRATE] Connecting to: {DATABASE_URL[:40]}...")
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
    print("[MIGRATE] Step 2v2 migration complete.")


if __name__ == "__main__":
    asyncio.run(run_migration())
