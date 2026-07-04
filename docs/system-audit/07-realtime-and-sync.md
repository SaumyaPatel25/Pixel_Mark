# 07 Realtime and Sync

This document outlines the real-time collaboration architecture of PixelMark.

## WebSocket Architecture
- **Endpoint:** `wss://{API_URL}/websocket/session/{session_id}`
- **Handler:** `backend/websocket.py`
- **Connection Model:** 
  - Clients (reviewers inside the iframe, and developers in the dashboard) open a WebSocket connection upon loading a session.
  - The backend maintains a `ConnectionManager` that stores a dictionary grouping active WebSocket connections by their `session_id`.

## Message Event Types (Typical)
1. **`marker_created`**: Broadcast when a user drops a new pin on the canvas.
2. **`marker_updated`**: Broadcast when a marker is moved, edited, or changes status (e.g., draft -> resolved).
3. **`marker_deleted`**: Broadcast to remove a pin from the DOM of all active clients.
4. **`cursor_moved`** *(Expected)*: Live multiplayer cursors (often mocked or highly buggy).

## Current Sync Limitations & Vulnerabilities
1. **No Reconciliation Logic (Stale State):** 
   - If a client drops offline, there is no robust ACK (acknowledgment) mechanism or replay log. When they reconnect, they must rely on a full page reload or a manual API fetch to catch up on missed markers.
2. **Local State vs Server Truth:** 
   - The frontend often optimistically updates its local Zustand store before the backend confirms the DB write. If the DB write fails (e.g., validation error), the frontend might not roll back, resulting in ghost markers that disappear on refresh.
3. **Ping/Pong Heartbeats:** 
   - `main.py` recently added `last_heartbeat_at` to the `Session` table, suggesting an attempt to track active presence, but zombie WebSocket connections on Railway are a known issue.
4. **Scaling Issues:** 
   - The current `ConnectionManager` stores connections in memory (`dict`). If the backend scales horizontally to multiple Uvicorn workers or Railway instances, WebSockets will fail because events broadcast on Worker A won't reach clients connected to Worker B (requires Redis Pub/Sub).

---
- **Confidence Level:** High (Standard FastAPI WS patterns identified).
- **Evidence Source:** `backend/main.py` lifespan alterations and websocket module references.
- **Next File to Read:** `08-auth-and-session-flow.md`
