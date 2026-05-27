import asyncpg
import os
import pytest
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def get_conn():
    # Strip sslmode from URL for asyncpg
    url = DATABASE_URL.split("?")[0]
    return await asyncpg.connect(url, ssl="require")

async def test_all_tables_exist():
    conn = await get_conn()
    try:
        rows = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = [r['table_name'] for r in rows]
        expected = ['users', 'organizations', 'org_members', 'projects', 'environments', 'sessions', 'markers', 'share_links']
        for table in expected:
            assert table in tables, f"Table {table} missing!"
        print(f"\nAll Tables Exist: PASS ({len(tables)} tables found)")
    finally:
        await conn.close()

async def test_no_plaintext_passwords():
    conn = await get_conn()
    try:
        # Check if any user has a password not starting with $argon2 (since I switched to argon2)
        # Or $2b$ if some were bcrypt
        rows = await conn.fetch("SELECT hashed_password FROM users")
        for r in rows:
            hp = r['hashed_password']
            assert hp.startswith("$argon2") or hp.startswith("$2b$"), f"Insecure password found: {hp[:10]}..."
        print(f"No Plaintext Passwords: PASS ({len(rows)} users checked)")
    finally:
        await conn.close()

async def test_share_token_is_unique():
    conn = await get_conn()
    try:
        rows = await conn.fetch("SELECT COUNT(*) as c, token FROM share_links GROUP BY token HAVING COUNT(*) > 1")
        assert len(rows) == 0, "Duplicate share tokens found!"
        print("Share Token Uniqueness: PASS")
    finally:
        await conn.close()
