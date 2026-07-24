import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from models import BlueprintActivityModel
from realtime.blueprint_presence import blueprint_presence_manager

logger = logging.getLogger("stage.blueprint_activity")

async def log_blueprint_activity(
    db: AsyncSession,
    project_id: str,
    event_type: str,
    target_type: str,
    summary_text: str,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    target_id: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None
) -> Optional[BlueprintActivityModel]:
    """
    Non-blocking helper for logging STAGE Blueprint workspace activity events.
    Emits database record and broadcasts to connected project WebSocket clients.
    """
    try:
        clean_actor_name = actor_name or "STAGE Collaborator"
        activity = BlueprintActivityModel(
            project_id=project_id,
            actor_id=actor_id,
            actor_name=clean_actor_name,
            event_type=event_type,
            target_type=target_type,
            target_id=target_id,
            summary_text=summary_text,
            metadata_json=metadata_json or {}
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)

        # Broadcast realtime event to Blueprint presence channel
        event_payload = {
            "type": "activity_event",
            "event": {
                "id": activity.id,
                "project_id": activity.project_id,
                "actor_id": activity.actor_id,
                "actor_name": activity.actor_name,
                "event_type": activity.event_type,
                "target_type": activity.target_type,
                "target_id": activity.target_id,
                "summary_text": activity.summary_text,
                "metadata_json": activity.metadata_json,
                "created_at": activity.created_at.isoformat() if activity.created_at else None
            }
        }
        await blueprint_presence_manager._broadcast(project_id, event_payload)

        return activity
    except Exception as e:
        logger.warning(f"[STAGE Blueprint Activity] Failed to log activity event ({event_type}): {e}")
        # Ensure parent session is clean
        try:
            await db.rollback()
        except Exception:
            pass
        return None
