import asyncio, os
from dotenv import load_dotenv
from sqlalchemy import select

# Set cwd to repository root so backend imports work
import sys
sys.path.append(os.path.abspath('.'))
sys.path.append(os.path.abspath('./backend'))

from backend.database import AsyncSessionLocal
from backend.models.core import Marker

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Marker).order_by(Marker.created_at.desc()).limit(10))
        markers = result.scalars().all()
        print(f"Latest 10 markers in DB:")
        for m in markers:
            print(f"ID: {m.id}, SessionID: {m.session_id}, Status: {m.status}, Note: {m.note}, Selector: {m.css_selector}, PageURL: {m.page_url}")

if __name__ == '__main__':
    load_dotenv()
    asyncio.run(main())
