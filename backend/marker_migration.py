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
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    if "sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0]

print(f"Connecting to database async: {DATABASE_URL}")

connect_args = {}
if "neon.tech" in DATABASE_URL:
    connect_args = {"ssl": True}

engine = create_async_engine(DATABASE_URL, connect_args=connect_args)

async def run_migration():
    async with engine.begin() as conn:
        def check_markers(sync_conn):
            inspector = inspect(sync_conn)
            return [c["name"] for c in inspector.get_columns("markers")]
        
        marker_cols = await conn.run_sync(check_markers)
        print("Existing markers columns:", marker_cols)
        
        is_postgres = "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL
        
        col_definitions = [
            ("x", "FLOAT" if is_postgres else "REAL", "NULL"),
            ("y", "FLOAT" if is_postgres else "REAL", "NULL"),
            ("viewport_x", "FLOAT" if is_postgres else "REAL", "NULL"),
            ("viewport_y", "FLOAT" if is_postgres else "REAL", "NULL"),
            ("element_selector", "TEXT", "NULL"),
            ("element_text", "TEXT", "NULL"),
            ("element_tag", "VARCHAR(255)" if is_postgres else "TEXT", "NULL"),
            ("note", "TEXT", "NULL"),
            ("severity", "VARCHAR(50)" if is_postgres else "TEXT", "DEFAULT 'medium'"),
            ("screenshot_required", "BOOLEAN", "DEFAULT FALSE"),
            ("created_via", "VARCHAR(50)" if is_postgres else "TEXT", "DEFAULT 'agent'"),
            ("share_link_id", "VARCHAR(255)" if is_postgres else "TEXT", "NULL REFERENCES share_links(id) ON DELETE SET NULL"),
            ("user_id", "VARCHAR(255)" if is_postgres else "TEXT", "NULL REFERENCES users(id) ON DELETE SET NULL"),
        ]
        
        for col_name, col_type, col_extra in col_definitions:
            if col_name not in marker_cols:
                print(f"Adding column {col_name} ({col_type}) to markers table...")
                # SQLite doesn't support column constraints like FOREIGN KEY in ALTER TABLE.
                # So for SQLite, we will strip references just in case.
                if not is_postgres and "REFERENCES" in col_extra:
                    col_extra = "NULL"
                await conn.execute(text(f"ALTER TABLE markers ADD COLUMN {col_name} {col_type} {col_extra}"))
        
        print("Markers migration successfully completed.")

if __name__ == "__main__":
    asyncio.run(run_migration())
