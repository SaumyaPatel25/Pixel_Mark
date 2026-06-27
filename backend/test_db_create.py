import asyncio
from database import engine, Base
from models.core import UserAIProviderConfig

async def run():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables verified")

asyncio.run(run())
