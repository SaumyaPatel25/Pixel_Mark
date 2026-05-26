from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(tags=["websocket"])

# session_id → list of connected websockets
active_connections: Dict[str, List[WebSocket]] = {}

async def broadcast(session_id: str, message: dict):
    if session_id in active_connections:
        dead = []
        for ws in active_connections[session_id]:
            try:
                await ws.send_json(message)
            except:
                dead.append(ws)
        for ws in dead:
            active_connections[session_id].remove(ws)

@router.websocket("/ws/session/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in active_connections:
        active_connections[session_id] = []
    active_connections[session_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await broadcast(session_id, message)
    except WebSocketDisconnect:
        active_connections[session_id].remove(websocket)
