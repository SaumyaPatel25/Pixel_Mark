from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db
from utils.flags import evaluate_session_flags, set_runtime_override, DEFAULT_FLAGS, _runtime_overrides, clear_runtime_overrides
from pydantic import BaseModel
from typing import Dict, Optional

router = APIRouter(prefix="/flags", tags=["flags"])

class FlagOverridePayload(BaseModel):
    flag_name: str
    enabled: bool

@router.get("/")
async def get_global_flags():
    """Get the current state of all evaluated feature flags based on env defaults and runtime overrides."""
    return {
        flag: _runtime_overrides.get(flag, DEFAULT_FLAGS.get(flag, True))
        for flag in DEFAULT_FLAGS
    }

@router.get("/session/{session_id}")
async def get_session_flags(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve session-aware evaluated feature flags."""
    return await evaluate_session_flags(session_id, db)

@router.post("/override")
async def override_flag(payload: FlagOverridePayload):
    """Set an immediate global runtime memory override for a feature flag."""
    if payload.flag_name not in DEFAULT_FLAGS:
        raise HTTPException(status_code=400, detail=f"Unknown feature flag: {payload.flag_name}")
    set_runtime_override(payload.flag_name, payload.enabled)
    return {
        "flag_name": payload.flag_name,
        "enabled": payload.enabled,
        "message": f"Runtime override successfully applied: {payload.flag_name}={payload.enabled}"
    }

@router.post("/reset")
async def reset_flags():
    """Clear all runtime overrides, falling back to environment variable defaults."""
    clear_runtime_overrides()
    return {"message": "All runtime feature flag overrides successfully cleared"}
