import os
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Session as DBSession

# Default state configuration from environment variables (defaults to True if not specified)
DEFAULT_FLAGS = {
    "heavy_render_mode": os.environ.get("FEATURE_HEAVY_RENDER_MODE", "true").lower() == "true",
    "conservative_proxy_mode": os.environ.get("FEATURE_CONSERVATIVE_PROXY_MODE", "true").lower() == "true",
    "canvas_capture": os.environ.get("FEATURE_CANVAS_CAPTURE", "true").lower() == "true",
    "mobile_performance_mode": os.environ.get("FEATURE_MOBILE_PERFORMANCE_MODE", "true").lower() == "true",
    "partial_render_fallback": os.environ.get("FEATURE_PARTIAL_RENDER_FALLBACK", "true").lower() == "true",
}

# Temporary on-the-fly dynamic memory overrides (for immediate admin deactivation without reload)
_runtime_overrides: Dict[str, bool] = {}

def get_flag(flag_name: str, session: Optional[DBSession] = None) -> bool:
    """
    Evaluates a feature flag state.
    Priority:
    1. Runtime memory override (Admin disable/enable).
    2. Session property overrides (if session is provided).
    3. Environment variable fallback config.
    """
    if flag_name in _runtime_overrides:
        return _runtime_overrides[flag_name]
        
    # Session-aware overrides
    if session is not None:
        if flag_name == "conservative_proxy_mode" and getattr(session, "conservative_render_mode", None) is not None:
            return session.conservative_render_mode
        if flag_name == "heavy_render_mode" and getattr(session, "heavy_mode", None) is not None:
            # If global heavy mode is disabled, override session detection
            if not DEFAULT_FLAGS.get("heavy_render_mode", True):
                return False
            return session.heavy_mode

    return DEFAULT_FLAGS.get(flag_name, True)

async def evaluate_session_flags(session_id: str, db: AsyncSession) -> Dict[str, bool]:
    """
    Fully evaluates and returns all active feature flags for a given session ID.
    Queries the database session state to resolve dynamic session properties.
    """
    dbsession = None
    if session_id:
        try:
            result = await db.execute(select(DBSession).where(DBSession.id == session_id))
            dbsession = result.scalar_one_or_none()
        except Exception:
            pass  # Fall back to global evaluation if DB lookup fails
            
    return {
        flag: get_flag(flag, dbsession)
        for flag in DEFAULT_FLAGS
    }

def set_runtime_override(flag_name: str, enabled: bool):
    """
    Sets a dynamic memory override for a feature flag.
    """
    if flag_name in DEFAULT_FLAGS:
        _runtime_overrides[flag_name] = enabled

def clear_runtime_overrides():
    """
    Clears all dynamic overrides back to defaults.
    """
    _runtime_overrides.clear()
