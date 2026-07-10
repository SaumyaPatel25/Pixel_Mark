from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime, timezone
import uuid
from markers.schemas import MarkerRead

class EventEnvelope(BaseModel):
    type: str
    session_id: str
    event_id: str
    occurred_at: datetime
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    marker_id: Optional[str] = None
    version: Optional[int] = None
    data: Dict[str, Any]

def build_marker_event(
    event_type: str, 
    session_id: str, 
    marker, 
    actor_id: Optional[str] = None, 
    actor_role: Optional[str] = None
) -> dict:
    marker_data = MarkerRead.model_validate(marker).model_dump(mode="json")
    
    return {
        "type": event_type,
        "session_id": session_id,
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "occurred_at": datetime.now(timezone.utc),
        "actor_id": actor_id,
        "actor_role": actor_role,
        "marker_id": marker.id,
        "version": marker.version,
        "data": {
            "marker": marker_data
        }
    }

def build_marker_deleted_event(
    session_id: str,
    marker,
    actor_id: Optional[str] = None,
    actor_role: Optional[str] = None
) -> dict:
    return {
        "type": "marker_deleted",
        "session_id": session_id,
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "occurred_at": datetime.now(timezone.utc),
        "actor_id": actor_id,
        "actor_role": actor_role,
        "marker_id": marker.id,
        "version": marker.version,
        "data": {
            "marker_id": marker.id
        }
    }

def build_system_event(
    event_type: str,
    session_id: str,
    data: Dict[str, Any]
) -> dict:
    return {
        "type": event_type,
        "session_id": session_id,
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "occurred_at": datetime.now(timezone.utc),
        "actor_id": None,
        "actor_role": None,
        "marker_id": None,
        "version": None,
        "data": data
    }
