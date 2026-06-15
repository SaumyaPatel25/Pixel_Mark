import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    project_id = "67aff0b7-b176-44b4-b917-d68911ae8fcd"
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Get project
        res = await conn.execute(text("SELECT name, url FROM projects WHERE id = :id"), {"id": project_id})
        project = res.fetchone()
        if project:
            print(f"Project Name: {project[0]} | URL: {project[1]}")
            
        # Get environments
        res = await conn.execute(text("SELECT name, base_url FROM environments WHERE project_id = :id"), {"id": project_id})
        envs = res.fetchall()
        for env in envs:
            print(f"Environment Name: {env[0]} | Base URL: {env[1]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
