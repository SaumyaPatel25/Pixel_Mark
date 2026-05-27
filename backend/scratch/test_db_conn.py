import asyncio
import traceback
from sqlalchemy import text
from database import engine

async def test_conn():
    print("Testing connection to database...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            row = result.fetchone()
            print("Successfully connected!")
            print("DB Version:", row[0])
    except Exception as e:
        print("Connection failed!")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_conn())
