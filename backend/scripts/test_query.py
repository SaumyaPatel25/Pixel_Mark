import asyncio
from database import AsyncSessionLocal
from models import User, Session, Project
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        print('Users:', [u.email for u in users])
        
        sessions = (await db.execute(select(Session))).scalars().all()
        
        print('Sessions:', [s.id for s in sessions])

if __name__ == '__main__':
    asyncio.run(run())
