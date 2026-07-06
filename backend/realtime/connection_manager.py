from fastapi import WebSocket
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger("pixelmark.realtime")

class ConnectionManager:
    def __init__(self):
        # Maps session_id -> list of tuple (WebSocket, metadata_dict)
        self._sessions: Dict[str, List[tuple[WebSocket, Dict[str, Any]]]] = {}

    async def connect(self, session_id: str, websocket: WebSocket, client_meta: Optional[Dict[str, Any]] = None):
        await websocket.accept()
        is_first = False
        if session_id not in self._sessions:
            self._sessions[session_id] = []
            is_first = True
            
        from realtime.redis_broadcaster import redis_broadcaster
        if is_first:
            redis_broadcaster.subscribe_to_session(session_id)
        
        meta = client_meta or {}
        meta.setdefault("connected_at", datetime.now(timezone.utc))
        meta.setdefault("last_heartbeat_at", datetime.now(timezone.utc))

        self._sessions[session_id].append((websocket, meta))
        logger.info(
            f"[WS] Client connected to session={session_id}. "
            f"actor={meta.get('actor_id')} ({meta.get('actor_role')}), kind={meta.get('client_kind')}. "
            f"Total connections={len(self._sessions[session_id])}"
        )

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self._sessions:
            for item in self._sessions[session_id]:
                if item[0] == websocket:
                    self._sessions[session_id].remove(item)
                    logger.info(f"[WS] Client disconnected from session={session_id}")
                    break
            
            if not self._sessions[session_id]:
                del self._sessions[session_id]
                from realtime.redis_broadcaster import redis_broadcaster
                redis_broadcaster.unsubscribe_from_session(session_id)

    async def send_to_client(self, websocket: WebSocket, event: dict):
        try:
            from realtime.events import EventEnvelope
            payload = EventEnvelope.model_validate(event).model_dump(mode="json")
            await websocket.send_json(payload)
        except Exception as e:
            logger.warning(f"[WS] Failed to send message to client: {e}")

    async def broadcast_to_session_local(self, session_id: str, event: dict, exclude: Optional[WebSocket] = None):
        if session_id not in self._sessions:
            return

        dead_sockets = []
        from realtime.events import EventEnvelope
        
        try:
            payload = EventEnvelope.model_validate(event).model_dump(mode="json")
            evt_type = payload.get("type")
            if evt_type in ["marker_created", "marker_updated", "marker_moved", "marker_resolved", "marker_deleted"]:
                logger.info(f"PixelMark ws marker event [{evt_type}] [{payload.get('marker_id')}] [{payload.get('actor_id')}]")
        except Exception as e:
            logger.error(f"[WS] Event serialization failed during broadcast: {e}")
            return

        for ws, meta in list(self._sessions[session_id]):
            if ws == exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception as e:
                logger.warning(f"[WS] Broadcast failed for socket in session={session_id}: {e}")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.disconnect(session_id, ws)

    def session_connection_count(self, session_id: str) -> int:
        if session_id in self._sessions:
            return len(self._sessions[session_id])
        return 0

    def update_heartbeat(self, session_id: str, websocket: WebSocket):
        if session_id in self._sessions:
            for ws, meta in self._sessions[session_id]:
                if ws == websocket:
                    meta["last_heartbeat_at"] = datetime.now(timezone.utc)
                    break

# Singleton connection manager
realtime_manager = ConnectionManager()
