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

print(f"Connecting to database async for auth email migration: {DATABASE_URL}")

connect_args = {}
if "neon.tech" in DATABASE_URL:
    connect_args = {"ssl": True}

engine = create_async_engine(DATABASE_URL, connect_args=connect_args)

async def run_migration():
    async with engine.begin() as conn:
        def check_users(sync_conn):
            inspector = inspect(sync_conn)
            return [c["name"] for c in inspector.get_columns("users")]
        
        user_cols = await conn.run_sync(check_users)
        
        if "is_verified" not in user_cols:
            print("Adding is_verified to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL"))
            
        if "verification_token" not in user_cols:
            print("Adding verification_token to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR NULL"))
            
        if "verification_token_expires_at" not in user_cols:
            print("Adding verification_token_expires_at to users table...")
            col_type = "TIMESTAMP WITH TIME ZONE" if "postgresql" in DATABASE_URL else "TIMESTAMP"
            await conn.execute(text(f"ALTER TABLE users ADD COLUMN verification_token_expires_at {col_type} NULL"))
            
        if "reset_token" not in user_cols:
            print("Adding reset_token to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR NULL"))
            
        if "reset_token_expires_at" not in user_cols:
            print("Adding reset_token_expires_at to users table...")
            col_type = "TIMESTAMP WITH TIME ZONE" if "postgresql" in DATABASE_URL else "TIMESTAMP"
            await conn.execute(text(f"ALTER TABLE users ADD COLUMN reset_token_expires_at {col_type} NULL"))

        print("OK - Auth email columns migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
