# Phase 4: Realtime Sync Hardening

## Problem Addressed
The audit revealed two main issues with the WebSocket implementation:
1. **Missed Updates:** When a client momentarily disconnected, markers created or updated by others during that gap were missed because the reconnect logic did not reconcile state with the server.
2. **Scale Limitations:** The `ConnectionManager` in `backend/websocket.py` is entirely in-memory. If PixelMark scales horizontally across multiple API workers or edge functions, a WebSocket message broadcasted by Worker A will never reach clients connected to Worker B.

## Solutions Implemented

### 1. Reconnect Reconciliation
- Modified `web/src/app/(dashboard)/sessions/[id]/page.tsx` to watch the `isConnected` state returned by `useSessionSocket`.
- When the socket connects or reconnects, the frontend instantly calls `fetchMarkers(sessionId)`.
- This overwrites the optimistic local state with the server's canonical truth, effortlessly syncing all creates, updates, and deletes that occurred during the offline gap without relying on complex delta-merging logic.

### 2. Single-Instance Documented & Upgrade Path Designed
The backend websocket logic was intentionally kept in-memory for the single-instance production setup to limit complexity.

#### Future Scale Upgrade Path (Redis Pub/Sub)
When the application needs to scale horizontally, we can upgrade `ConnectionManager` seamlessly without touching frontend logic or changing event schemas.

**Proposed Abstraction:**
```python
import aioredis

class RedisConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.redis = aioredis.from_url("redis://localhost")
        self.pubsub = self.redis.pubsub()
    
    async def listen(self):
        # Subscribe to a global channel, e.g., "pixelmark_events"
        await self.pubsub.subscribe("pixelmark_events")
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                # Route the message to active websockets
                await self._distribute(data["session_id"], data["payload"])
                
    async def broadcast(self, session_id: str, payload: dict):
        # Instead of sending directly to sockets, publish to Redis
        await self.redis.publish("pixelmark_events", json.dumps({
            "session_id": session_id,
            "payload": payload
        }))
```
This requires running a background asyncio task to `listen()` when the FastAPI app starts.
