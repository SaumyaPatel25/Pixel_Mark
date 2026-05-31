import asyncio
from sqlalchemy import text
from database import engine

async def run_migration():
    async with engine.begin() as conn:
        print("Adding new columns to share_links table...")
        await conn.execute(text("ALTER TABLE share_links ADD COLUMN IF NOT EXISTS accessed_count INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE share_links ADD COLUMN IF NOT EXISTS created_by VARCHAR;"))
        await conn.execute(text("ALTER TABLE share_links ADD COLUMN IF NOT EXISTS can_comment BOOLEAN DEFAULT TRUE;"))
        await conn.execute(text("ALTER TABLE share_links ADD COLUMN IF NOT EXISTS session_id VARCHAR;"))
        
        # If there were old links, we might need to link them to sessions, 
        # but since we are rebuilding, we can assume it's fine for now or they will be broken.
        print("✓ Migration successful!")

if __name__ == "__main__":
    asyncio.run(run_migration())
