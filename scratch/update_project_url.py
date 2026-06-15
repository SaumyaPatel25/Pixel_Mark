import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    old_url = "https://opinvox.com"
    new_url = "https://opinvox.entrext.com/"
    
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Check matching projects
        res = await conn.execute(
            text("SELECT id, name, url FROM projects WHERE url LIKE '%opinvox.com%'")
        )
        projects = res.fetchall()
        print(f"Found {len(projects)} matching projects in DB:")
        for proj in projects:
            print(f"- ID: {proj[0]} | Name: {proj[1]} | Old URL: {proj[2]}")
            
        # Update projects
        if projects:
            update_res = await conn.execute(
                text("UPDATE projects SET url = :new_url WHERE url LIKE '%opinvox.com%'"),
                {"new_url": new_url}
            )
            await conn.commit()
            print(f"Updated {update_res.rowcount} project records to {new_url}!")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
