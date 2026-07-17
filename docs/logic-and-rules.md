# Business Logic and Rules

This document outlines the validation rules, security gates, anchor specifications, and permission matrices that govern the PixelMark workspace.

---

## 1. Permission and Role Authorization Matrix
PixelMark secures resources using membership roles inside organizations. In addition, review sessions support token-based URL access (`share_token`).

| Action | Developer (Owner/Admin) | Reviewer (Auth Token) | Anonymous Client | Code Reference |
| --- | --- | --- | --- | --- |
| **Initialize Project** | Allowed | Denied | Denied | `routes/projects.py` |
| **Start Session** | Allowed | Denied | Denied | `routes/sessions.py` |
| **Place Bug Pin (Marker)** | Allowed | Allowed | Denied | `markers/router.py` |
| **Modify Marker Details** | Allowed (All pins) | Allowed (Own pins only) | Denied | `markers/service.py` |
| **Soft Delete Marker** | Allowed (All pins) | Allowed (Own pins only) | Denied | `markers/service.py` |
| **Record DOM Edit** | Allowed | Allowed | Denied | `routers/dom_edits.py` |
| **Delete DOM Edit** | Allowed (Session Owner) | Denied | Denied | `routers/dom_edits.py` |
| **Configure API Keys** | Allowed | Denied | Denied | `routers/settings.py` |

---

## 2. Onboarding Gating Rules
The interactive "Product Tour" guide must auto-start only when:
1. The user has logged in successfully.
2. The user has zero projects (`projects.length === 0`).
3. The onboarding state is not already active, completed, or dismissed.
- *Evidence: web/src/app/(dashboard)/DashboardLayoutClient.tsx:55-82*

---

## 3. Review Session Recycling and Concurrency Limits
To prevent unnecessary database allocations, session generation enforces two structural constraints:
1. **Recycling**: If a session exists for the target project that was created within the last 5 minutes, that session is reused instead of allocating a new one.
2. **Concurrency Limits**: Organizations are capped at a maximum of **3 active sessions**. Creating a 4th session automatically sets the oldest active session's status to `closed`.
- *Evidence: backend/routes/sessions.py:40-85*

---

## 4. API Key Limits & Rotation
- **Key Limit**: A user can have a maximum of **5 active API keys** at any time. Further creations are rejected with a 400 Bad Request error.
- **Rotation**: Rotating a key flags the previous token as revoked (`revoked_at = datetime.utcnow()`) and generates a new token.
- *Evidence: backend/routers/settings.py:15-77*

---

## 5. Visual Marker Anchor Classifications
When feedback is recorded, the coordinate mapping strategy depends on the type of target element being audited:

```
                  ┌────────────────────────┐
                  │ Target Element Clicked │
                  └───────────┬────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
      [Is Canvas?]                         [HTML Nodes?]
            │                                   │
      ┌─────┴───────┐                     ┌─────┴───────┐
      ▼             ▼                     ▼             ▼
  [WebGL?]    [Standard?]           [Has Selector?]  [Raw Coord?]
      │             │                     │             │
      ▼             ▼                     ▼             ▼
(WebGL Clip) (Canvas Relative)       (DOM Relative) (Viewport Abs)
```

### 5.1 DOM-Relative Anchor (`dom-relative`)
- **Use Case**: Standard HTML text, inputs, buttons, and layout containers.
- **Parameters**: `target_selector` (CSS path), `target_xpath`, `dom_text_excerpt`.
- **Logic**: Click coordinates are stored as ratio percentages relative to the target element's bounding box. This ensures pins remain aligned even when the page is viewed on different screen sizes or screen layouts resize.

### 5.2 Viewport-Absolute Anchor (`viewport-absolute`)
- **Use Case**: Fallback for coordinates that cannot be resolved to a specific DOM node.
- **Parameters**: `page_x`, `page_y`, `scroll_x`, `scroll_y`, `viewport_width`, `viewport_height`.
- **Logic**: Positions pins relative to the overall document width/height dimensions.

### 5.3 Canvas-Relative Anchor (`canvas-relative`)
- **Use Case**: HTML5 2D Canvas elements.
- **Parameters**: `canvas_id`.
- **Logic**: Stores offsets as percentages relative to the canvas element's border box, rather than the viewport.

### 5.4 WebGL Clip-Space Anchor (`webgl-clip-space`)
- **Use Case**: WebGL-based 3D engines (e.g. Three.js, Babylon.js).
- **Parameters**: `webgl_clip_x`, `webgl_clip_y`.
- **Logic**: Converts coordinates into normalized device coordinates (between -1.0 and 1.0). This keeps annotations anchored to the correct 3D spatial points regardless of viewport scaling.

---

## 6. Optimistic UI and Version Resolution
- **Version Field**: Database records for markers include a `version` integer (starting at 1).
- **Conflict Resolution**: Client mutation queries (`PATCH`) must pass an `expected_version` property. If the database version exceeds this expected version, the API returns a `409 Conflict`.
- **Reconciliation**: The client store catches conflicts, reverts local optimistic changes, fetches the latest markers, and updates the UI.
- *Evidence: backend/markers/service.py:72-98*, *web/src/store/markerStore.ts:303-316*
