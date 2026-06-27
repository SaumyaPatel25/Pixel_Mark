import asyncio
from database import AsyncSessionLocal
from models import User, OrgMember, Project, Session, RoleEnum
from sqlalchemy import select
from auth import hash_password
import uuid

async def run():
    async with AsyncSessionLocal() as db:
        # Get a session with markers
        # We know 56daf2dc-714d-4c8f-ad57-0481ca31fd77 has 20 markers
        sess_id = '56daf2dc-714d-4c8f-ad57-0481ca31fd77'
        result = await db.execute(select(Session).where(Session.id == sess_id))
        sess = result.scalar_one()
        
        proj_id = sess.project_id
        result = await db.execute(select(Project).where(Project.id == proj_id))
        proj = result.scalar_one()
        
        org_id = proj.org_id
        
        # Create user
        user_id = str(uuid.uuid4())
        user = User(id=user_id, email='test_ai_triage@example.com', hashed_password=hash_password('password123'), name='Test AI')
        db.add(user)
        
        # Create org member
        member = OrgMember(id=str(uuid.uuid4()), org_id=org_id, user_id=user_id, role=RoleEnum.admin)
        db.add(member)
        
        await db.commit()
        print('User created and added to org!')

if __name__ == '__main__':
    asyncio.run(run())
