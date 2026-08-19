# Real-Time Collaboration & Synchronization Architecture

STAGE features a sub-millisecond, bi-directional real-time collaboration engine that synchronizes visual QA feedback, live cursor positions, user presence, and live DOM mutations across all active reviewers and developers.

---

## 1. Real-Time Architecture

```mermaid
graph LR
    UserA[Reviewer A (Next.js)] -->|WebSocket Connect /ws/sessions/{id}| WSManager[FastAPI WebSocket Manager]
    UserB[Reviewer B (Next.js)] -->|WebSocket Connect /ws/sessions/{id}| WSManager
    
    subgraph FastAPI Realtime Engine
        WSManager --> ChannelRouter[Session Channel Broadcast Router]
        ChannelRouter --> RedisPubSub[(Optional Redis Pub/Sub)]
    end
    
    WSManager -->|Broadcast marker:create| UserB
    WSManager -->|Broadcast cursor:move| UserB
```

---

## 2. WebSocket Protocol & Lifecycle

### A. Connection Endpoint
- **URL**: `ws://localhost:8765/ws/sessions/{session_id}` (or `wss://api.stage.entrext.com/ws/sessions/{session_id}`)
- **Auth**: Handled via `token` query param or session cookie header.

### B. Event Types & Payloads

#### 1. Presence & Live Cursors
- `presence:join`: Broadcasts reviewer identity (display name, avatar, color token, role).
- `presence:leave`: Removes disconnected reviewer from the presence list.
- `cursor:move`: High-frequency throttled cursor position broadcast:
  ```json
  {
    "type": "cursor:move",
    "user_id": "usr_99812",
    "display_name": "Alex",
    "color_token": "#8B5CF6",
    "x_ratio": 0.421,
    "y_ratio": 0.814,
    "page_url": "https://example.com/checkout"
  }
  ```

#### 2. Marker Lifecycle
- `marker:create`: Emitted when a pin is placed on DOM/Canvas elements.
- `marker:update`: Emitted on status change (`open` $\to$ `resolved`), description edit, or coordinate shift.
- `marker:delete`: Emitted on soft-deletion.

#### 3. Blueprint DOM Mutations
- `dom_edit:apply`: Broadcasts live CSS style or text mutations to all connected peers inspecting the same page.

---

## 3. Client Reconnection & Heartbeat

- **Ping / Pong Interval**: Server sends heartbeat pings every 25 seconds; client responds with pong.
- **Exponential Backoff**: If network connectivity drops, the Next.js client automatically retries connection at `1s`, `2s`, `4s`, `8s` (max 15s) intervals.
- **Offline Queuing**: Marker creations and comments placed during temporary disconnections are queued in memory and re-synced upon reconnect.
