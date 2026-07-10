import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import engine, Base

async def run():
    print("Testing DB connection...")
    try:
        async with engine.begin() as conn:
            print("Connected! Running sync create_all...")
            await conn.run_sync(Base.metadata.create_all)
        print("Success!")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(run())
