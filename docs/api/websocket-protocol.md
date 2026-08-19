# WebSocket Realtime Protocol Specification

This document provides the formal wire-format specification for real-time WebSocket communication in STAGE.

---

## 1. Connection Handshake

- **Endpoint**: `/ws/sessions/{session_id}`
- **Protocols**: `wss://` (Production), `ws://` (Local Dev)
- **Query Parameters**:
  - `token` (Optional): JWT auth token or reviewer share link token.
  - `display_name` (Optional): Display name for public anonymous reviewers.

---

## 2. Server-to-Client Messages

### `presence:sync`
Sent immediately upon successful handshake with the full list of currently active participants.
```json
{
  "event": "presence:sync",
  "data": {
    "session_id": "99f848ab-3660-449e-87cb-15509748b6c0",
    "participants": [
      {
        "id": "usr_abc123",
        "display_name": "Sarah Connor",
        "role": "developer",
        "color_token": "#10B981"
      }
    ]
  }
}
```

### `marker:created`
Broadcast when a reviewer creates a new feedback marker.
```json
{
  "event": "marker:created",
  "data": {
    "id": "mrk_44810a9",
    "project_id": "prj_001",
    "session_id": "99f848ab-3660-449e-87cb-15509748b6c0",
    "title": "Button misalignment on mobile",
    "description": "The CTA button overflows the viewport on iPhone 14.",
    "status": "open",
    "priority": "high",
    "anchor_kind": "dom",
    "target_selector": "button.checkout-cta",
    "offset_x_ratio": 0.512,
    "offset_y_ratio": 0.741,
    "page_url": "https://example.com/pricing",
    "creator_name": "Sarah Connor",
    "created_at": "2026-08-19T11:20:00Z"
  }
}
```

### `marker:updated`
Broadcast on marker status updates or title/description edits.
```json
{
  "event": "marker:updated",
  "data": {
    "id": "mrk_44810a9",
    "status": "resolved",
    "version": 2,
    "updated_at": "2026-08-19T11:22:15Z"
  }
}
```

### `marker:deleted`
Broadcast when a marker is soft-deleted.
```json
{
  "event": "marker:deleted",
  "data": {
    "id": "mrk_44810a9",
    "session_id": "99f848ab-3660-449e-87cb-15509748b6c0"
  }
}
```

---

## 3. Client-to-Server Messages

### `cursor:update`
Throttled to max 30 fps (every ~33ms).
```json
{
  "action": "cursor:update",
  "x_ratio": 0.324,
  "y_ratio": 0.651,
  "page_url": "https://example.com/pricing"
}
```

### `ping`
Client heartbeat.
```json
{
  "action": "ping",
  "timestamp": 1787123984123
}
```
