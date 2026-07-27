import asyncio
import os
import sys
import uuid
from typing import Optional

# Ensure python path includes backend directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database import AsyncSessionLocal
from models.core import User, Organization, OrgMember, SubscriptionModel, RoleEnum
from auth import pwd_context
from services.plan_capabilities import invalidate_org_plan_cache

async def bootstrap_internal_qa_account(
    email_override: Optional[str] = None,
    password_override: Optional[str] = None
):
    print("[INTERNAL QA BOOTSTRAP] Initializing secure internal developer QA account...")

    qa_email = email_override or os.environ.get("STAGE_INTERNAL_QA_EMAIL", "saumyavishwam@gmail.com")
    qa_password = password_override or os.environ.get("STAGE_INTERNAL_QA_PASSWORD")

    if not qa_password:
        # Generate random secure one-time password if env var not set, without printing to logs
        qa_password = f"StageQA!_{uuid.uuid4().hex[:12]}"
        print("[INTERNAL QA BOOTSTRAP] STAGE_INTERNAL_QA_PASSWORD not set in environment. Using generated secure password.")

    qa_password_hash = pwd_context.hash(qa_password)

    org_id = "stage_internal_qa_org"
    org_name = "STAGE Internal Engineering & QA"
    org_slug = "stage-internal-qa"

    async with AsyncSessionLocal() as session:
        # 1. Bootstrap Internal Organization
        org_res = await session.execute(
            SubscriptionModel.__table__.select().where(Organization.id == org_id) if hasattr(SubscriptionModel, "select") else
            Organization.__table__.select().where(Organization.id == org_id)
        )
        # Query Organization
        from sqlalchemy import select
        org_q = await session.execute(select(Organization).where(Organization.id == org_id))
        org = org_q.scalar_one_or_none()

        if not org:
            org = Organization(
                id=org_id,
                name=org_name,
                slug=org_slug,
                is_internal=True
            )
            session.add(org)
            print(f"[OK] Created internal organization: {org_name} (id={org_id})")
        else:
            org.is_internal = True
            print(f"[OK] Existing organization updated to internal: {org_name}")

        # 2. Bootstrap Internal QA User
        user_q = await session.execute(select(User).where(User.email == qa_email))
        user = user_q.scalar_one_or_none()

        if not user:
            user = User(
                id=f"usr_qa_{uuid.uuid4().hex[:8]}",
                email=qa_email,
                name="STAGE QA Engineering",
                hashed_password=qa_password_hash,
                is_verified=True
            )
            session.add(user)
            print(f"[OK] Created internal QA user: {qa_email}")
        else:
            # Update password hash if explicitly provided in run
            if password_override or os.environ.get("STAGE_INTERNAL_QA_PASSWORD"):
                user.hashed_password = qa_password_hash
            user.is_verified = True
            print(f"[OK] Existing user verified for internal QA: {qa_email}")

        await session.flush()

        # 3. Bootstrap Org Membership
        mem_q = await session.execute(
            select(OrgMember).where(OrgMember.user_id == user.id, OrgMember.org_id == org_id)
        )
        member = mem_q.scalar_one_or_none()

        if not member:
            member = OrgMember(
                org_id=org_id,
                user_id=user.id,
                role=RoleEnum.owner
            )
            session.add(member)
            print(f"[OK] Added user {qa_email} as billing owner of {org_name}")
        else:
            member.role = RoleEnum.owner

        # 4. Bootstrap Enterprise Internal Subscription
        sub_q = await session.execute(
            select(SubscriptionModel).where(SubscriptionModel.org_id == org_id)
        )
        sub = sub_q.scalar_one_or_none()

        if not sub:
            sub = SubscriptionModel(
                id=f"sub_internal_{uuid.uuid4().hex[:8]}",
                org_id=org_id,
                plan_type="enterprise",
                status="active",
                seats_allowed=9999,
                projects_allowed=9999,
                is_test_mode=True
            )
            session.add(sub)
            print(f"[OK] Created Enterprise internal subscription for {org_name}")
        else:
            sub.plan_type = "enterprise"
            sub.status = "active"
            sub.seats_allowed = 9999
            sub.projects_allowed = 9999
            print(f"[OK] Updated Enterprise internal subscription for {org_name}")

        await session.commit()
        invalidate_org_plan_cache(org_id)

    print("[INTERNAL QA BOOTSTRAP SUCCESS] Internal developer QA environment ready!")
    return {
        "org_id": org_id,
        "email": qa_email,
        "is_internal": True,
        "status": "ready"
    }

if __name__ == "__main__":
    asyncio.run(bootstrap_internal_qa_account())
