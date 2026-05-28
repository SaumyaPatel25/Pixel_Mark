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
        if "current_page_url" not in session_cols:
            print("Adding current_page_url to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN current_page_url VARCHAR NULL"))
        if "pages_visited" not in session_cols:
            print("Adding pages_visited to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN pages_visited INTEGER DEFAULT 0"))

        # Check markers columns
        def check_markers(sync_conn):
            inspector = inspect(sync_conn)
            return [c["name"] for c in inspector.get_columns("markers")]
            
        marker_cols = await conn.run_sync(check_markers)
        if "page_url" not in marker_cols:
            print("Adding page_url to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN page_url VARCHAR NULL"))
        if "page_title" not in marker_cols:
            print("Adding page_title to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN page_title VARCHAR NULL"))
        if "renderer_type" not in marker_cols:
            print("Adding renderer_type to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN renderer_type VARCHAR NULL DEFAULT 'unknown'"))
        if "canvas_context" not in marker_cols:
            print("Adding canvas_context to markers table...")
            col_type = "JSONB" if "postgresql" in DATABASE_URL else "JSON"
            await conn.execute(text(f"ALTER TABLE markers ADD COLUMN canvas_context {col_type} NULL"))
        if "marker_number" not in marker_cols:
            print("Adding marker_number to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN marker_number INTEGER DEFAULT 0"))
        if "agent_version" not in marker_cols:
            print("Adding agent_version to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN agent_version VARCHAR NULL DEFAULT '1.0'"))

        # Check if page_visits table exists
        def check_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()
            
        tables = await conn.run_sync(check_tables)
        if "page_visits" not in tables:
            print("Creating page_visits table...")
            if "postgresql" in DATABASE_URL:
                await conn.execute(text("""
                    CREATE TABLE page_visits (
                        id VARCHAR PRIMARY KEY,
                        session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                        page_url VARCHAR NOT NULL,
                        page_title VARCHAR NULL,
                        visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        renderer_type VARCHAR NULL,
                        screenshot_url VARCHAR NULL
                    )
                """))
            else:
                await conn.execute(text("""
                    CREATE TABLE page_visits (
                        id VARCHAR PRIMARY KEY,
                        session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                        page_url VARCHAR NOT NULL,
                        page_title VARCHAR NULL,
                        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        renderer_type VARCHAR NULL,
                        screenshot_url VARCHAR NULL
                    )
                """))
            print("[OK] page_visits table created successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
    print("Migration completed successfully!")
