import asyncio
import ssl
import asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_nVHq5Eu9YNUT@ep-soft-fog-apo5qj7w-pooler.c-7.us-east-1.aws.neon.tech/neondb"

async def check():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    conn = await asyncpg.connect(DATABASE_URL, ssl=ctx)

    # 1. Check subscriptions for plan_source column (written by identity_resolver)
    print("=== subscriptions columns ===")
    cols = await conn.fetch("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'subscriptions' ORDER BY ordinal_position;
    """)
    for c in cols:
        print(f"  {c['column_name']} ({c['data_type']})")

    # 2. Check user_ai_provider_configs table exists
    print("\n=== user_ai_provider_configs columns ===")
    cols2 = await conn.fetch("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'user_ai_provider_configs' ORDER BY ordinal_position;
    """)
    if cols2:
        for c in cols2:
            print(f"  {c['column_name']} ({c['data_type']})")
    else:
        print("  TABLE DOES NOT EXIST")

    # 3. List all tables in the DB
    print("\n=== All tables in neondb ===")
    tables = await conn.fetch("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name;
    """)
    for t in tables:
        print(f"  {t['table_name']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
