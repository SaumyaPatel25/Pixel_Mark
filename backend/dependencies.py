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
        membership = result.scalar_one_or_none()
        role_order = [RoleEnum.guest, RoleEnum.member, RoleEnum.admin, RoleEnum.owner]
        if not membership or role_order.index(membership.role) < role_order.index(minimum_role):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return membership
    return checker
