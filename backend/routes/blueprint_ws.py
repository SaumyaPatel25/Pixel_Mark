from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from realtime.blueprint_presence import blueprint_presence_manager
import logging

logger = logging.getLogger("stage.blueprint_ws_route")

router = APIRouter(tags=["blueprint_ws"])

@router.websocket("/ws/canvas/{project_id}")
async def websocket_blueprint_canvas_route(
    websocket: WebSocket,
    project_id: str,
    user_id: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    avatar_url: Optional[str] = Query(None)
):
    clean_user_id = user_id or f"anon_{id(websocket)}"
    clean_name = name or "STAGE Collaborator"

    user_info = {
        "user_id": clean_user_id,
        "name": clean_name,
        "color": color,
        "avatar_url": avatar_url
    }

    await blueprint_presence_manager.connect(project_id, websocket, user_info)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif event_type == "cursor_move":
                x = data.get("x", 0)
                y = data.get("y", 0)
                frame_id = data.get("frame_id")
                await blueprint_presence_manager.broadcast_cursor(
                    project_id, websocket, clean_user_id, x, y, frame_id
                )
            elif event_type == "selection_change":
                frame_id = data.get("frame_id")
                target_selector = data.get("target_selector")
                await blueprint_presence_manager.broadcast_selection(
                    project_id, websocket, clean_user_id, frame_id, target_selector
                )

    except WebSocketDisconnect:
        logger.info(f"[STAGE Blueprint WS] WebSocket disconnected: user={clean_user_id}")
        await blueprint_presence_manager.disconnect(project_id, websocket)
    except Exception as e:
        logger.warning(f"[STAGE Blueprint WS] Connection loop error: {e}")
        await blueprint_presence_manager.disconnect(project_id, websocket)
