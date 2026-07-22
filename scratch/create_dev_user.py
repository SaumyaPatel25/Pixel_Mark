import asyncio
import sys
import os
import uuid

# Add backend directory to sys.path
sys.path.insert(0, r"c:\Users\saumy\OneDrive\Desktop\Entrext\backend")

from database import AsyncSessionLocal
from models.core import User, OrgMember, Organization, RoleEnum
from auth import hash_password
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Check if user already exists
        email = "developer@stage.com"
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        hashed = hash_password("password123")
        
        if user:
            print(f"User {email} already exists. Updating password...")
            user.hashed_password = hashed
            user.is_verified = True
            user_id = user.id
        else:
            print(f"Creating new user {email}...")
            user_id = str(uuid.uuid4())
            user = User(
                id=user_id,
                email=email,
                hashed_password=hashed,
                name="Developer",
                is_verified=True
            )
            db.add(user)
        
        # Get all organizations
        result_orgs = await db.execute(select(Organization))
        orgs = result_orgs.scalars().all()
        print(f"Found {len(orgs)} organizations.")
        
        for org in orgs:
            # Check if membership already exists
            res_mem = await db.execute(
                select(OrgMember).where(
                    OrgMember.org_id == org.id,
                    OrgMember.user_id == user_id
                )
            )
            mem = res_mem.scalar_one_or_none()
            if not mem:
                print(f"Adding user to organization {org.name} ({org.id}) as owner...")
                member = OrgMember(
                    id=str(uuid.uuid4()),
                    org_id=org.id,
                    user_id=user_id,
                    role=RoleEnum.owner
                )
                db.add(member)
            else:
                print(f"User is already a member of organization {org.name} ({org.id}). Role: {mem.role}")
                mem.role = RoleEnum.owner
                
        await db.commit()
        print("Success!")

if __name__ == '__main__':
    asyncio.run(main())
