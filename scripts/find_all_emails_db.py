import asyncio
import re
from database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND data_type IN ('character varying', 'text', 'json', 'jsonb')
        """))
        cols = res.fetchall()
        
        found_emails = {}
        for table, col in cols:
            try:
                q = await db.execute(text(f'SELECT DISTINCT "{col}"::text FROM "{table}" WHERE "{col}" IS NOT NULL'))
                rows = q.scalars().all()
                for r in rows:
                    if r and "@" in str(r):
                        matches = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", str(r))
                        for m in matches:
                            em = m.lower().strip()
                            if not em.endswith(".png") and not em.endswith(".js"):
                                found_emails.setdefault(em, set()).add(f"{table}.{col}")
            except Exception as e:
                pass
        
        print(f"Total unique emails found: {len(found_emails)}")
        for em, srcs in sorted(found_emails.items()):
            print(f"{em} -> {list(srcs)}")

if __name__ == "__main__":
    asyncio.run(check())
