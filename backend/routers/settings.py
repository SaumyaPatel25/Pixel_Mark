from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from dependencies import get_db, get_current_user
from models.core import User, ApiKey
from schemas.core import ApiKeyCreate, ApiKeyRead, ApiKeyCreatedResponse
from services.crypto import generate_token, hash_token, mask_token
from ratelimit import check_rate_limit
from logger import logger
from typing import List
from datetime import datetime

router = APIRouter(prefix="/settings/api-keys", tags=["API Keys"])

MAX_KEYS_PER_USER = 5

@router.get("", response_model=List[ApiKeyRead])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return keys

@router.post("", response_model=ApiKeyCreatedResponse)
async def create_api_key(
    payload: ApiKeyCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Rate limiting: max 5 creations per minute
    check_rate_limit(request, action_name=f"api_key_create:{current_user.id}", max_requests=5, window_seconds=60)

    # 2. Key limit check: max 5 keys active keys (non-revoked)
    active_count_result = await db.execute(
        select(func.count(ApiKey.id))
        .where(ApiKey.user_id == current_user.id)
        .where(ApiKey.revoked_at.is_(None))
    )
    active_count = active_count_result.scalar() or 0
    if active_count >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"You can have a maximum of {MAX_KEYS_PER_USER} active API keys. Please revoke an existing key first."
        )

    # 3. Generate and store
    raw_token = generate_token()
    hashed = hash_token(raw_token)
    masked = mask_token(raw_token)

    new_key = ApiKey(
        user_id=current_user.id,
        name=payload.name,
        token_hash=hashed,
        masked_token=masked
    )

    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    logger.info(f"Audit Log - API Key Created: user_id={current_user.id}, key_id={new_key.id}, name='{new_key.name}'")

    return ApiKeyCreatedResponse(
        id=new_key.id,
        name=new_key.name,
        created_at=new_key.created_at,
        raw_token=raw_token
    )

@router.post("/{id}/rotate", response_model=ApiKeyCreatedResponse)
async def rotate_api_key(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Rate limit check for rotate
    check_rate_limit(request, action_name=f"api_key_rotate:{current_user.id}", max_requests=5, window_seconds=60)

    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.id == id)
        .where(ApiKey.user_id == current_user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Revoke old key
    key.revoked_at = datetime.utcnow()
    
    # Generate new key
    raw_token = generate_token()
    hashed = hash_token(raw_token)
    masked = mask_token(raw_token)

    new_key = ApiKey(
        user_id=current_user.id,
        name=f"{key.name} (Rotated)",
        token_hash=hashed,
        masked_token=masked
    )

    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    logger.info(f"Audit Log - API Key Rotated: user_id={current_user.id}, old_key_id={key.id}, new_key_id={new_key.id}")

    return ApiKeyCreatedResponse(
        id=new_key.id,
        name=new_key.name,
        created_at=new_key.created_at,
        raw_token=raw_token
    )

@router.delete("/{id}")
async def revoke_api_key(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.id == id)
        .where(ApiKey.user_id == current_user.id)
        .where(ApiKey.revoked_at.is_(None))
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found or already revoked")

    key.revoked_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Audit Log - API Key Revoked: user_id={current_user.id}, key_id={id}")
    return {"success": True, "message": "API key successfully revoked"}

@router.post("/{id}/mark-used")
async def mark_api_key_used(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.id == id)
        .where(ApiKey.user_id == current_user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.last_used_at = datetime.utcnow()
    await db.commit()
    return {"success": True}
