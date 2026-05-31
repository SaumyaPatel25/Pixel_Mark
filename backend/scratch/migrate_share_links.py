import asyncio
import sys
sys.path.insert(0, '.')

from database import engine, Base
import models  # ensure all models imported

async def migrate():
    from sqlalchemy import text
    
    async with engine.begin() as conn:
        # Try Postgres/Neon first
        try:
            result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='share_links'"))
            existing_cols = {row[0] for row in result.fetchall()}
            is_sqlite = False
        except Exception:
            # SQLite fallback
            result = await conn.execute(text("PRAGMA table_info(share_links)"))
            existing_cols = {row[1] for row in result.fetchall()}
            is_sqlite = True
        
        print('Existing columns:', sorted(existing_cols))
        print('Using SQLite:', is_sqlite)
        
        migrations = [
            ('label', "ALTER TABLE share_links ADD COLUMN label VARCHAR DEFAULT 'Shared Link'"),
            ('role', "ALTER TABLE share_links ADD COLUMN role VARCHAR DEFAULT 'tester'"),
            ('max_uses', 'ALTER TABLE share_links ADD COLUMN max_uses INTEGER'),
            ('use_count', 'ALTER TABLE share_links ADD COLUMN use_count INTEGER DEFAULT 0'),
            ('is_active', 'ALTER TABLE share_links ADD COLUMN is_active BOOLEAN DEFAULT TRUE'),
        ]
        
        for col, sql in migrations:
            if col not in existing_cols:
                try:
                    await conn.execute(text(sql))
                    print(f'Added column: {col}')
                except Exception as e:
                    print(f'Failed to add {col}: {e}')
            else:
                print(f'Column already exists: {col}')
        
        print('Migration complete!')

asyncio.run(migrate())
