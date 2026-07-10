from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from typing import Optional, Any
from database import AsyncSessionLocal
from realtime.connection_manager import realtime_manager
from realtime.events import build_system_event, build_marker_event
from markers.repository import MarkerRepository
from markers.schemas import MarkerRead
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger("pixelmark.realtime")

router = APIRouter(tags=["realtime"])

# Dependency that returns the session maker
async def get_db_sessionmaker() -> Any:
    return AsyncSessionLocal

async def broadcast_presence(session_id: str, sessionmaker: Any):
    connections = realtime_manager._sessions.get(session_id, [])
    online_actor_ids = {meta.get("actor_id") for _, meta in connections if meta.get("actor_id")}

    db_maker = sessionmaker or AsyncSessionLocal
    async with db_maker() as db:
        from markers.models import ReviewerIdentity
        from models.core import User
        from sqlalchemy import select

        # Fetch reviewers for session
        res = await db.execute(select(ReviewerIdentity).where(ReviewerIdentity.session_id == session_id))
        reviewers = res.scalars().all()

        # Fetch developers connected
        dev_ids = [
            meta.get("actor_id")
            for _, meta in connections
            if meta.get("actor_role") == "developer" and meta.get("actor_id")
        ]
        developers = []
        if dev_ids:
            dev_res = await db.execute(select(User).where(User.id.in_(dev_ids)))
            developers = dev_res.scalars().all()

        participants = []

        # Add developers (only if connected)
        for dev in developers:
            participants.append({
                "id": dev.id,
                "name": dev.name or dev.email,
                "role": "developer",
                "color_token": "#4f46e5",
                "is_online": True,
                "last_seen_at": datetime.now(timezone.utc).isoformat()
            })

        # Add reviewers (all created identities for the session)
        for rev in reviewers:
            is_online = rev.id in online_actor_ids
            participants.append({
                "id": rev.id,
                "name": rev.display_name,
                "role": "reviewer",
                "color_token": rev.color_token,
                "is_online": is_online,
                "last_seen_at": (rev.last_seen_at or rev.created_at).isoformat()
            })

    presence_event = build_system_event(
        event_type="presence_updated",
        session_id=session_id,
        data={
            "participants": participants
        }
    )
    await realtime_manager.broadcast_to_session_local(session_id, presence_event)


async def handle_websocket(
    websocket: WebSocket,
    session_id: str,
    actor_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    client_kind: Optional[str] = None,
    sessionmaker: Any = None
):
    client_meta = {
        "actor_id": actor_id,
        "actor_role": actor_role,
        "client_kind": client_kind
    }
    
    # Accept connection and track in manager
    await realtime_manager.connect(session_id, websocket, client_meta)

    # Update last_seen_at if reviewer
    if actor_role == "reviewer" and actor_id:
        db_maker = sessionmaker or AsyncSessionLocal
        async with db_maker() as db:
            from markers.models import ReviewerIdentity
            from sqlalchemy import update
            await db.execute(
                update(ReviewerIdentity)
                .where(ReviewerIdentity.id == actor_id)
                .values(last_seen_at=datetime.now(timezone.utc))
            )
            await db.commit()

    # Immediately send a connection ready event
    welcome_event = build_system_event(
        event_type="session_reconciled",
        session_id=session_id,
        data={
            "status": "ready",
            "message": "Authoritative realtime connection established",
            "connection_count": realtime_manager.session_connection_count(session_id)
        }
    )
    await realtime_manager.send_to_client(websocket, welcome_event)

    # Broadcast updated presence
    if actor_id:
        logger.info(f"PixelMark presence joined [{actor_id}]")
        await broadcast_presence(session_id, sessionmaker)

    try:
        while True:
            raw_data = await websocket.receive_text()
            
            # Simple ping-pong
            if raw_data.strip() == "ping":
                await websocket.send_text("pong")
                realtime_manager.update_heartbeat(session_id, websocket)
                continue
                
            try:
                message = json.loads(raw_data)
            except Exception:
                logger.warning(f"[WS] Received invalid JSON from client in session={session_id}")
                continue

            msg_type = message.get("type")

            if msg_type == "heartbeat":
                realtime_manager.update_heartbeat(session_id, websocket)
                ack_event = build_system_event("heartbeat", session_id, {"status": "ack"})
                await realtime_manager.send_to_client(websocket, ack_event)

            elif msg_type == "session_snapshot_requested":
                logger.info(f"[WS] Client requested session snapshot for session={session_id}")
                
                # Fetch markers within a short-lived DB context to avoid pool exhaustion
                db_maker = sessionmaker or AsyncSessionLocal
                async with db_maker() as db:
                    repo = MarkerRepository(db)
                    markers = await repo.list_markers_by_session(session_id=session_id, include_deleted=False)
                    
                    # Order deterministically: created_at asc, id asc
                    markers.sort(key=lambda m: (m.created_at or datetime.min, m.id))
                    
                    serialized_markers = [
                        MarkerRead.model_validate(m).model_dump(mode="json")
                        for m in markers
                    ]
                
                snapshot_event = build_system_event(
                    event_type="session_snapshot",
                    session_id=session_id,
                    data={
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                        "markers": serialized_markers,
                        "connection_count": realtime_manager.session_connection_count(session_id)
                    }
                )
                await realtime_manager.send_to_client(websocket, snapshot_event)
                
    except WebSocketDisconnect:
        realtime_manager.disconnect(session_id, websocket)
        if actor_id:
            logger.info(f"PixelMark presence left [{actor_id}]")
            await broadcast_presence(session_id, sessionmaker)
    except Exception as e:
        logger.error(f"[WS] Connection error in session={session_id}: {e}")
        realtime_manager.disconnect(session_id, websocket)
        try:
            if actor_id:
                logger.info(f"PixelMark presence left [{actor_id}]")
                await broadcast_presence(session_id, sessionmaker)
        except Exception:
            pass


@router.websocket("/ws/sessions/{session_id}")
async def websocket_sessions_route(
    websocket: WebSocket,
    session_id: str,
    actor_id: Optional[str] = Query(None),
    actor_role: Optional[str] = Query(None),
    client_kind: Optional[str] = Query(None),
    sessionmaker: Any = Depends(get_db_sessionmaker)
):
    await handle_websocket(websocket, session_id, actor_id, actor_role, client_kind, sessionmaker)


@router.websocket("/ws/session/{session_id}")
async def websocket_session_legacy_route(
    websocket: WebSocket,
    session_id: str,
    actor_id: Optional[str] = Query(None),
    actor_role: Optional[str] = Query(None),
    client_kind: Optional[str] = Query(None),
    sessionmaker: Any = Depends(get_db_sessionmaker)
):
    """
    Legacy path endpoint to prevent frontend breakage.
    """
    await handle_websocket(websocket, session_id, actor_id, actor_role, client_kind, sessionmaker)
