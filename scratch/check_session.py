import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    target_uuid = "6ba1f9ed-13e7-4056-a54c-c101bdeefc3e"
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print(f"Searching database for UUID: {target_uuid}...")
        
        # Check sessions
        res = await conn.execute(text("SELECT id, project_id, title FROM sessions WHERE id = :id"), {"id": target_uuid})
        row = res.fetchone()
        if row:
            print(f"FOUND IN SESSIONS: ID={row[0]} | ProjectID={row[1]} | Title={row[2]}")
            
        # Check projects
        res = await conn.execute(text("SELECT id, name, url FROM projects WHERE id = :id"), {"id": "67aff0b7-b176-44b4-b917-d68911ae8fcd"})
        row = res.fetchone()
        if row:
            print(f"FOUND IN PROJECTS: ID={row[0]} | Name={row[1]} | URL={row[2]}")

        # Check share_links
        res = await conn.execute(text("SELECT id, session_id, token, label FROM share_links WHERE id = :id OR token = :id"), {"id": target_uuid})
        row = res.fetchone()
        if row:
            print(f"FOUND IN SHARE_LINKS: ID={row[0]} | SessionID={row[1]} | Token={row[2]} | Label={row[3]}")
            
        # Check page_visits
        res = await conn.execute(text("SELECT id, session_id, page_url FROM page_visits WHERE id = :id"), {"id": target_uuid})
        row = res.fetchone()
        if row:
            print(f"FOUND IN PAGE_VISITS: ID={row[0]} | SessionID={row[1]} | URL={row[2]}")

        # Check markers
        res = await conn.execute(text("SELECT id, session_id, title FROM markers WHERE id = :id"), {"id": target_uuid})
        row = res.fetchone()
        if row:
            print(f"FOUND IN MARKERS: ID={row[0]} | SessionID={row[1]} | Title={row[2]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
