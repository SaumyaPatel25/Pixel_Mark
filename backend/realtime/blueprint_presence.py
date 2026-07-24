import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger("stage.blueprint_presence")

# Predefined vibrant palette for STAGE Blueprint presence avatars & cursors
PRESENCE_COLORS = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b",
    "#06b6d4", "#6366f1", "#f43f5e", "#14b8a6", "#a855f7"
]

class BlueprintPresenceManager:
    def __init__(self):
        # project_id -> List of (WebSocket, user_dict)
        self._project_sockets: Dict[str, List[tuple[WebSocket, Dict[str, Any]]]] = {}
        self._color_index: int = 0

    def _get_next_color(self) -> str:
        color = PRESENCE_COLORS[self._color_index % len(PRESENCE_COLORS)]
        self._color_index += 1
        return color

    async def connect(self, project_id: str, websocket: WebSocket, user_info: Dict[str, Any]):
        await websocket.accept()
        if project_id not in self._project_sockets:
            self._project_sockets[project_id] = []

        if not user_info.get("color"):
            user_info["color"] = self._get_next_color()

        user_info["connected_at"] = asyncio.get_event_loop().time()
        self._project_sockets[project_id].append((websocket, user_info))

        user_id = user_info.get("user_id", "anon")
        logger.info(f"[STAGE Blueprint WS] Client connected: project={project_id}, user={user_id}")

        # Send current presence state snapshot to newly connected client
        active_users = [info for ws, info in self._project_sockets[project_id]]
        await websocket.send_json({
            "type": "presence_state",
            "users": active_users
        })

        # Broadcast join event to all OTHER clients in project
        await self._broadcast(project_id, {
            "type": "presence_join",
            "user": user_info
        }, exclude_ws=websocket)

    async def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id not in self._project_sockets:
            return

        leaving_user_id = None
        remaining = []
        for ws, info in self._project_sockets[project_id]:
            if ws == websocket:
                leaving_user_id = info.get("user_id")
            else:
                remaining.append((ws, info))

        self._project_sockets[project_id] = remaining

        if not self._project_sockets[project_id]:
            del self._project_sockets[project_id]

        if leaving_user_id:
            logger.info(f"[STAGE Blueprint WS] Client disconnected: project={project_id}, user={leaving_user_id}")
            await self._broadcast(project_id, {
                "type": "presence_leave",
                "user_id": leaving_user_id
            })

    async def broadcast_cursor(self, project_id: str, sender_ws: WebSocket, user_id: str, x: float, y: float, frame_id: Optional[str] = None):
        await self._broadcast(project_id, {
            "type": "cursor_move",
            "user_id": user_id,
            "x": x,
            "y": y,
            "frame_id": frame_id
        }, exclude_ws=sender_ws)

    async def broadcast_selection(self, project_id: str, sender_ws: WebSocket, user_id: str, frame_id: Optional[str], target_selector: Optional[str]):
        await self._broadcast(project_id, {
            "type": "selection_change",
            "user_id": user_id,
            "frame_id": frame_id,
            "target_selector": target_selector
        }, exclude_ws=sender_ws)

    async def _broadcast(self, project_id: str, message: dict, exclude_ws: Optional[WebSocket] = None):
        if project_id not in self._project_sockets:
            return

        dead_sockets = []
        for ws, info in self._project_sockets[project_id]:
            if ws == exclude_ws:
                continue
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"[STAGE Blueprint WS] Send error to client {info.get('user_id')}: {e}")
                dead_sockets.append(ws)

        if dead_sockets:
            for dws in dead_sockets:
                await self.disconnect(project_id, dws)

blueprint_presence_manager = BlueprintPresenceManager()
