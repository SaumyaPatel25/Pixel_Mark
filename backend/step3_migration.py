"""
PixelMark Step 3 — Marker table migration
Adds new columns and alters the status column type for robust review item persistence.
"""

import asyncio
import os
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
        
        # Define new columns
        col_definitions = [
            ("project_id", "VARCHAR(255)" if is_postgres else "TEXT", "NULL"),
            ("comment", "TEXT", "NULL"),
            ("capture_payload", "JSONB" if is_postgres else "JSON", "NULL"),
            ("coordinates", "JSONB" if is_postgres else "JSON", "NULL"),
            ("target", "JSONB" if is_postgres else "JSON", "NULL"),
            ("source", "JSONB" if is_postgres else "JSON", "NULL"),
            ("screenshots", "JSONB" if is_postgres else "JSON", "NULL"),
            ("diagnostics", "JSONB" if is_postgres else "JSON", "NULL"),
            ("created_by", "VARCHAR(255)" if is_postgres else "TEXT", "NULL"),
            ("parent_page_id", "VARCHAR(255)" if is_postgres else "TEXT", "NULL"),
        ]
        
        for col_name, col_type, col_extra in col_definitions:
            if col_name not in marker_cols:
                print(f"Adding column {col_name} ({col_type}) to markers table...")
                await conn.execute(text(f"ALTER TABLE markers ADD COLUMN {col_name} {col_type} {col_extra}"))
        
        # Modify status column type to support string values dynamically (especially on Postgres where it was Enum)
        if is_postgres:
            print("Altering status column type to VARCHAR(64) on Postgres...")
            try:
                # Drop default constraint first if any, or just force type cast
                await conn.execute(text("ALTER TABLE markers ALTER COLUMN status TYPE VARCHAR(64)"))
                print("Status column successfully altered on Postgres.")
            except Exception as e:
                print(f"Failed to alter status column: {e}")
        else:
            print("Status column remains TEXT/VARCHAR compatible on SQLite.")
            
        print("Step 3 migration successfully completed.")

if __name__ == "__main__":
    asyncio.run(run_migration())
