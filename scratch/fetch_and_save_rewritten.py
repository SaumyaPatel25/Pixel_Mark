import httpx
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import asyncio

async def main():
    session_id = None
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT s.id FROM sessions s JOIN projects p ON s.project_id = p.id WHERE p.url LIKE '%webrox.xyz%' ORDER BY s.created_at DESC LIMIT 1")
        )
        row = res.fetchone()
        if row:
            session_id = row[0]
    await engine.dispose()
    
    if not session_id:
        print("No session found for webrox.xyz")
        return
        
    url = f"https://stage-production.up.railway.app/proxy/session/{session_id}"
    print(f"Fetching rewritten HTML from: {url}")
    resp = httpx.get(url, follow_redirects=True, timeout=20.0)
    
    with open("scratch/rewritten_webrox.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print("Saved rewritten HTML to scratch/rewritten_webrox.html")

if __name__ == "__main__":
    asyncio.run(main())
