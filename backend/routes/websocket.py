from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
from websocket import manager

router = APIRouter(tags=["websocket"])



@router.websocket("/ws/{project_id}")
async def websocket_project(websocket: WebSocket, project_id: str):
    # This uses the project-wide manager from backend/websocket.py
    await manager.connect(project_id, websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
