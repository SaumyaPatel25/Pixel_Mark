from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from dependencies import get_db, get_current_user
from models.core import User, UserAIProviderConfig
from schemas.core import UserAIProviderConfigRead, UserAIProviderConfigCreate, UserAIProviderConfigUpdate
from constants import PROVIDER_METADATA
import uuid
from typing import List

router = APIRouter(prefix="/ai/providers", tags=["AI Providers"])

import logging
from utils.encryption import encrypt_secret, decrypt_secret, mask_secret

logger = logging.getLogger(__name__)

def maybe_encrypt_api_key(raw_key: str) -> str:
    return encrypt_secret(raw_key)

def maybe_decrypt_api_key(stored_key: str) -> str:
    return decrypt_secret(stored_key)

def build_safe_provider_response(config: UserAIProviderConfig) -> dict:
    return {
        "id": config.id,
        "provider": config.provider,
        "display_name": config.display_name,
        "base_url": config.base_url,
        "model_name": config.model_name,
        "is_active": config.is_active,
        "is_default": config.is_default,
        "supports_openai_compat": config.supports_openai_compat,
        "has_api_key": bool(config.encrypted_api_key)
    }

async def unset_other_defaults(db: AsyncSession, user_id: str, keep_config_id: str):
    await db.execute(
        update(UserAIProviderConfig)
        .where(UserAIProviderConfig.user_id == user_id)
        .where(UserAIProviderConfig.id != keep_config_id)
        .values(is_default=False)
    )

@router.get("", response_model=List[UserAIProviderConfigRead])
async def list_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.user_id == current_user.id)
        .order_by(desc(UserAIProviderConfig.is_default), desc(UserAIProviderConfig.created_at))
    )
    configs = result.scalars().all()
    return [build_safe_provider_response(c) for c in configs]


@router.post("", response_model=UserAIProviderConfigRead)
async def create_provider(
    config_in: UserAIProviderConfigCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    provider = config_in.provider
    if provider not in PROVIDER_METADATA:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    
    meta = PROVIDER_METADATA[provider]
    base_url = config_in.base_url if config_in.base_url is not None else meta.get("default_base_url")
    model_name = config_in.model_name if config_in.model_name is not None else meta.get("default_model")
    
    # Check if this is the user's first config
    result = await db.execute(
        select(UserAIProviderConfig).where(UserAIProviderConfig.user_id == current_user.id)
    )
    existing = result.scalars().all()
    is_default = len(existing) == 0

    new_config = UserAIProviderConfig(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        provider=provider,
        display_name=config_in.display_name,
        encrypted_api_key=maybe_encrypt_api_key(config_in.api_key),
        base_url=base_url,
        model_name=model_name,
        is_active=True,
        is_default=is_default,
        supports_openai_compat=meta.get("supports_openai_compat", False)
    )
    
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)
    
    return build_safe_provider_response(new_config)


@router.patch("/{config_id}", response_model=UserAIProviderConfigRead)
async def update_provider(
    config_id: str,
    update_data: UserAIProviderConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.id == config_id)
        .where(UserAIProviderConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Config not found or access denied")
        
    if update_data.display_name is not None:
        config.display_name = update_data.display_name
    if update_data.base_url is not None:
        config.base_url = update_data.base_url
    if update_data.model_name is not None:
        config.model_name = update_data.model_name
    if update_data.is_active is not None:
        config.is_active = update_data.is_active
    if update_data.api_key is not None:
        config.encrypted_api_key = maybe_encrypt_api_key(update_data.api_key)
        
    if update_data.is_default is True:
        config.is_default = True
        await unset_other_defaults(db, current_user.id, config_id)
    elif update_data.is_default is False:
        config.is_default = False
        
    await db.commit()
    await db.refresh(config)
    
    return build_safe_provider_response(config)


@router.delete("/{config_id}")
async def delete_provider(
    config_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.id == config_id)
        .where(UserAIProviderConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Config not found or access denied")
        
    was_default = config.is_default
    
    await db.delete(config)
    await db.commit()
    
    if was_default:
        res2 = await db.execute(
            select(UserAIProviderConfig)
            .where(UserAIProviderConfig.user_id == current_user.id)
            .where(UserAIProviderConfig.is_active == True)
            .order_by(desc(UserAIProviderConfig.created_at))
            .limit(1)
        )
        new_def = res2.scalar_one_or_none()
        if new_def:
            new_def.is_default = True
            await db.commit()
            
    return {"success": True}


@router.post("/{config_id}/set-default", response_model=UserAIProviderConfigRead)
async def set_default_provider(
    config_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.id == config_id)
        .where(UserAIProviderConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Config not found or access denied")
        
    config.is_default = True
    await unset_other_defaults(db, current_user.id, config_id)
    await db.commit()
    await db.refresh(config)
    
    return build_safe_provider_response(config)


@router.post("/{config_id}/test")
async def test_provider(
    config_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserAIProviderConfig)
        .where(UserAIProviderConfig.id == config_id)
        .where(UserAIProviderConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Config not found or access denied")
        
    if not config.encrypted_api_key:
        return {"success": False, "message": "No API key saved"}
        
    api_key = maybe_decrypt_api_key(config.encrypted_api_key)
    
    if config.provider == "ollama":
        import httpx
        try:
            url = f"{config.base_url.rstrip('/')}/tags" if config.base_url else "http://localhost:11434/api/tags"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=5.0)
                resp.raise_for_status()
            return {"success": True, "message": "Connection successful."}
        except Exception as e:
            logger.error(f"Connection test failed for Ollama: {e}")
            return {"success": False, "message": "Could not reach the provider. Check the base URL, API key, or model."}
            
    if not config.supports_openai_compat:
        return {"success": False, "message": "Provider saved, but live testing for this provider is not implemented yet."}
        
    from openai import AsyncOpenAI
    try:
        client = AsyncOpenAI(api_key=api_key, base_url=config.base_url if config.base_url else None)
        # Lightweight test call (list models)
        await client.models.list(timeout=10.0)
        return {"success": True, "message": "Connection successful."}
    except Exception as e:
        # Do not log or expose exact tracebacks with secrets
        err_str = str(e)
        if api_key in err_str:
            err_str = err_str.replace(api_key, mask_secret(api_key))
        logger.error(f"Connection test failed for provider {config.provider} (masked key: {mask_secret(api_key)}): {err_str}")
        return {"success": False, "message": "Could not reach the provider. Check the base URL, API key, or model."}
