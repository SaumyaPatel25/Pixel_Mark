import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    new_url = "https://opinvox.entrext.com/"
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id, name, base_url FROM environments WHERE base_url LIKE '%opinvox.com%'")
        )
        envs = res.fetchall()
        print(f"Found {len(envs)} matching environment base_urls in DB:")
        for env in envs:
            print(f"- ID: {env[0]} | Name: {env[1]} | Old base_url: {env[2]}")
            
        if envs:
            update_res = await conn.execute(
                text("UPDATE environments SET base_url = :new_url WHERE base_url LIKE '%opinvox.com%'"),
                {"new_url": new_url}
            )
            await conn.commit()
            print(f"Updated {update_res.rowcount} environment records to {new_url}!")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
