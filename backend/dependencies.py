from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User, OrgMember, RoleEnum, ApiKey
from auth import decode_token

from typing import Optional

bearer_scheme = HTTPBearer(auto_error=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    try:
        if token.startswith("pm_"):
            from services.crypto import hash_token
            hashed = hash_token(token)
            result = await db.execute(
                select(ApiKey)
                .where(ApiKey.token_hash == hashed)
                .where(ApiKey.revoked_at.is_(None))
            )
            api_key = result.scalar_one_or_none()
            if not api_key:
                return None
            user_result = await db.execute(select(User).where(User.id == api_key.user_id))
            return user_result.scalar_one_or_none()
        else:
            payload = decode_token(token)
            user_id = payload.get("sub")
            result = await db.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
    except Exception:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    if token.startswith("pm_"):
        # API Key authentication
        from services.crypto import hash_token
        from datetime import datetime
        
        hashed = hash_token(token)
        result = await db.execute(
            select(ApiKey)
            .where(ApiKey.token_hash == hashed)
            .where(ApiKey.revoked_at.is_(None))
        )
        api_key = result.scalar_one_or_none()
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid or revoked API Key")
            
        # Update last_used_at
        api_key.last_used_at = datetime.utcnow()
        await db.commit()
        
        # Load user
        user_result = await db.execute(select(User).where(User.id == api_key.user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    else:
        # Standard JWT Authentication
        try:
            payload = decode_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

def require_role(minimum_role: RoleEnum):
    async def checker(org_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        result = await db.execute(
            select(OrgMember).where(
                OrgMember.org_id == org_id,
                OrgMember.user_id == current_user.id
            )
        )
        membership = result.scalars().first()
        role_order = [RoleEnum.guest, RoleEnum.member, RoleEnum.admin, RoleEnum.owner]
        if not membership or role_order.index(membership.role) < role_order.index(minimum_role):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return membership
    return checker


async def check_project_limit(org_id: str, db: AsyncSession = Depends(get_db)):
    from models import SubscriptionModel, Project
    from sqlalchemy import func

    res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
    sub = res.scalar_one_or_none()
    projects_allowed = sub.projects_allowed if sub else 5

    count_res = await db.execute(select(func.count(Project.id)).where(Project.org_id == org_id))
    projects_used = count_res.scalar() or 0

    if projects_used >= projects_allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_PROJECTS_EXCEEDED",
                "message": f"Project limit ({projects_allowed}) reached for your current STAGE plan. Please upgrade to Dev Team."
            }
        )


async def check_seat_limit(org_id: str, db: AsyncSession = Depends(get_db)):
    from models import SubscriptionModel, OrgMember
    from sqlalchemy import func

    res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
    sub = res.scalar_one_or_none()
    seats_allowed = sub.seats_allowed if sub else 1

    count_res = await db.execute(select(func.count(OrgMember.id)).where(OrgMember.org_id == org_id))
    seats_used = count_res.scalar() or 0

    if seats_used >= seats_allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_SEATS_EXCEEDED",
                "message": f"Developer seat limit ({seats_allowed}) reached for your current STAGE plan. Please upgrade your STAGE subscription."
            }
        )


def require_plan_feature(feature_name: str):
    async def feature_checker(org_id: Optional[str] = None, current_user: Optional[User] = None, db: AsyncSession = Depends(get_db)):
        from models import SubscriptionModel, OrgMember

        target_org_id = org_id
        if not target_org_id and current_user:
            res = await db.execute(select(OrgMember).where(OrgMember.user_id == getattr(current_user, "id", None)))
            mem = res.scalar_one_or_none()
            if mem:
                target_org_id = mem.org_id

        if not target_org_id:
            return True

        sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == target_org_id))
        sub = sub_res.scalar_one_or_none()

        if feature_name == "blueprint_dom_edit":
            if not sub or sub.plan_type == "solopreneur" or sub.status != "active":
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "FEATURE_REQUIRES_DEV_TEAM_PLAN",
                        "message": "Blueprint DOM Edit mode requires the STAGE Dev Team plan."
                    }
                )
        return True
    return feature_checker

