import asyncio
import uuid
from database import AsyncSessionLocal
from models.core import User, Organization, OrgMember, Project, RoleEnum
from auth import hash_password

async def run():
    async with AsyncSessionLocal() as db:
        user_id = str(uuid.uuid4())
        email = "developer@pixelmark.com"
        
        # Create user
        user = User(
            id=user_id,
            email=email,
            hashed_password=hash_password("password123"),
            name="Developer",
            is_verified=True
        )
        db.add(user)
        
        # Create Org
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id,
            name="Dev Org",
            slug=f"dev-org-{org_id[:8]}"
        )
        db.add(org)
        
        # Create Org Member
        member = OrgMember(
            id=str(uuid.uuid4()),
            org_id=org_id,
            user_id=user_id,
            role=RoleEnum.admin
        )
        db.add(member)
        
        # Create a Project
        proj_id = str(uuid.uuid4())
        proj = Project(
            id=proj_id,
            org_id=org_id,
            name="Dev Project",
            url="http://localhost:3000"
        )
        db.add(proj)
        
        await db.commit()
        print(f"Developer account created!")
        print(f"Email: {email}")
        print(f"Password: password123")

if __name__ == '__main__':
    asyncio.run(run())
