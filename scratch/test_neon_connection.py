import asyncio
import ssl
import asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_nVHq5Eu9YNUT@ep-soft-fog-apo5qj7w-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def test_conn():
    print("Testing direct asyncpg connection to Neon DB...")
    
    # Strip query params
    clean_url = DATABASE_URL.split("?")[0]
    
    # Create SSL context for Windows
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        conn = await asyncpg.connect(clean_url, ssl=ctx)
        print(" Connected to Neon DB successfully!")
        
        # Check projects
        rows = await conn.fetch("SELECT id, name, org_id, created_at FROM projects;")
        print(f"\n--- PROJECTS IN NEON DB ({len(rows)}) ---")
        for r in rows:
            print(f"  Project: '{r['name']}' | ID: {r['id']} | Org: {r['org_id']} | Created: {r['created_at']}")
            
        # Check users
        user_rows = await conn.fetch("SELECT id, email, name FROM users;")
        print(f"\n--- USERS IN NEON DB ({len(user_rows)}) ---")
        for u in user_rows:
            print(f"  User: '{u['name']}' | Email: '{u['email']}' | ID: {u['id']}")

        # Check organizations
        org_rows = await conn.fetch("SELECT id, name, is_internal FROM organizations;")
        print(f"\n--- ORGANIZATIONS IN NEON DB ({len(org_rows)}) ---")
        for o in org_rows:
            print(f"  Org: '{o['name']}' | ID: {o['id']} | is_internal: {o['is_internal']}")

        # Check subscriptions
        sub_rows = await conn.fetch("SELECT id, org_id, plan_type, status, projects_allowed, seats_allowed FROM subscriptions;")
        print(f"\n--- SUBSCRIPTIONS IN NEON DB ({len(sub_rows)}) ---")
        for s in sub_rows:
            print(f"  Sub: org_id='{s['org_id']}', plan_type='{s['plan_type']}', status='{s['status']}', projects_allowed={s['projects_allowed']}")

        await conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
