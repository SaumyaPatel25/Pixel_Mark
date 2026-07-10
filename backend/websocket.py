from fastapi import WebSocket
from typing import Dict, List, Optional
from logger import logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info(f"[WS] Peer joined project={project_id}. Total={len(self.active_connections[project_id])}")

    def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
                logger.info(f"[WS] Peer left project={project_id}")

    async def broadcast(self, project_id: str, message: dict, exclude: Optional[WebSocket] = None):
        if project_id in self.active_connections:
            dead_links = []
            for connection in self.active_connections[project_id]:
                if connection == exclude: continue
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_links.append(connection)
            
            for dead in dead_links:
                self.disconnect(project_id, dead)

manager = ConnectionManager()
