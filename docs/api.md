# STAGE API Specification

This document provides the reference for all active REST endpoints and WebSocket protocols exposed by the **STAGE** backend API (`http://localhost:8765`).

---

## 1. Authentication & Security Headers

### 1.1 Authorization Schemes
- **Bearer JWT**: Standard user authentication. Passed via header: `Authorization: Bearer <access_token>`.
- **Session Cookie (`stagesessionid`)**: Identifies active proxy review sessions. Set with `SameSite=None; Secure; HttpOnly; Path=/; Max-Age=86400`. Dual-read migration supports legacy `pixelmark_session_id`.
- **Guest Share Token (`X-Share-Token` or query `?token=...`)**: Grants unauthenticated guest reviewers access to a scoped project or session.

### 1.2 Common HTTP Status Codes
- `200 OK` / `201 Created` / `204 No Content`: Successful execution.
- `400 Bad Request`: Validation failure or missing parameters.
- `401 Unauthorized`: Missing or invalid Bearer token / Firebase ID token.
- `403 Forbidden`: Insufficient permissions or entitlement limit exceeded (e.g. `UPGRADE_REQUIRED`).
- `404 Not Found`: Entity (project, session, frame, marker) does not exist.
- `409 Conflict`: Unique constraint violation (e.g. duplicate email registration).
- `422 Unprocessable Entity`: Request body schema validation error.
- `429 Too Many Requests`: Rate limit exceeded.
- `502 Bad Gateway` / `504 Gateway Timeout`: Target website fetch failure via reverse proxy.

---

## 2. API Route Inventory by Domain

```
STAGE API (FastAPI)
├── /auth               Authentication & Identity Federation
├── /projects           Project Workspace & Environment Management
├── /sessions           Interactive Review Session Lifecycle
├── /canvas             Blueprint Spatial Canvas Elements
├── /projects/.../blueprint  Blueprint DOM Edit Targets & EditSets
├── /proxy              Target Site Reverse Proxy & Asset Resolvers
├── /billing            Dodo Payments Checkout & Webhook Pipeline
├── /markers            Unified Visual Pins, Anchors & Comments
├── /share-links        Unified Password-Protected Reviewer Links
├── /review             Guest Reviewer Verification & Context
├── /ai                 AI Assisting Commentary, Triage & BYOK
├── /settings           User, Project & Organization Configurations
├── /notifications      In-App Notifications & Delivery Logs
├── /export             JSON, ZIP & GitHub Issue Synchronization
├── /admin              Platform Metrics, Early-Bird & Quota Administration
└── /redemption         Promotional Redemption Codes
```

---

## 3. Auth Domain (`/auth`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | None (Rate-limited: 10/min) | Register with email and password |
| `POST` | `/auth/login` | None (Rate-limited: 10/min) | Authenticate with email/password and obtain JWT |
| `POST` | `/auth/firebase-sync` | None | Verify Firebase ID token and return STAGE JWT |
| `GET` | `/auth/oauth/github/start` | None | Initiates GitHub OAuth flow with state cookie |
| `GET` | `/auth/oauth/github/callback`| None | GitHub OAuth callback, exchanges code for JWT |
| `GET` | `/auth/me` | Bearer JWT | Retrieve currently authenticated user profile |
| `PATCH`| `/auth/me` | Bearer JWT | Update user name or avatar URL |
| `PUT` | `/auth/me/onboarding` | Bearer JWT | Update user interactive onboarding state JSON |
| `POST` | `/auth/verify-email` | None | Verify user email address with token |
| `POST` | `/auth/resend-verification`| None | Resend verification email |
| `POST` | `/auth/request-password-reset` | None | Request password reset email |
| `POST` | `/auth/reset-password` | None | Reset password with token |

### Detailed Endpoint Contracts

#### `POST /auth/register`
- **Request Body (`RegisterRequest`)**:
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password_8_chars",
    "name": "Alex Developer"
  }
  ```
- **Response `201 Created` (`RegisterResponse`)**:
  ```json
  {
    "message": "Registration successful",
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "user@example.com",
      "name": "Alex Developer",
      "is_verified": false
    }
  }
  ```

#### `POST /auth/firebase-sync`
- **Request Body (`FirebaseSyncRequest`)**:
  ```json
  {
    "id_token": "eyJhbGciOi...",
    "name": "Alex Developer"
  }
  ```
- **Response `200 OK` (`ExtendedTokenResponse`)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "user@example.com",
      "name": "Alex Developer",
      "is_verified": true,
      "identities": [
        {
          "provider": "google",
          "provider_user_id": "google_123456",
          "provider_email": "user@example.com"
        }
      ]
    }
  }
  ```

---

## 4. Projects & Workspaces Domain (`/projects`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects` | Bearer JWT | List all projects belonging to user's organization |
| `POST` | `/projects` | Bearer JWT | Create a new project workspace (quota enforced) |
| `GET` | `/projects/{project_id}` | Bearer JWT | Get project workspace metadata and environments |
| `PATCH`| `/projects/{project_id}` | Bearer JWT | Update project name, URL, or reviewer DOM edit permissions |
| `DELETE`|`/projects/{project_id}` | Bearer JWT (Owner) | Delete project and cascade all sessions/markers |
| `GET` | `/projects/{project_id}/environments` | Bearer JWT | List environments for project |
| `POST` | `/projects/{project_id}/environments` | Bearer JWT | Create a project environment (e.g. Staging, Prod) |

#### `POST /projects`
- **Request Body (`ProjectCreate`)**:
  ```json
  {
    "name": "Client Redesign 2026",
    "url": "https://client-staging.example.com"
  }
  ```
- **Response `201 Created` (`ProjectOut`)**:
  ```json
  {
    "id": "d3b07384-d113-46fb-a006-c8789326d9ec",
    "name": "Client Redesign 2026",
    "url": "https://client-staging.example.com",
    "created_at": "2026-09-03T10:00:00Z"
  }
  ```
- **Error Codes**:
  - `403 Forbidden`: `{"detail": "Project limit reached for your plan. Please upgrade."}`

---

## 5. Review Sessions Domain (`/sessions`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/sessions` | Bearer JWT | List review sessions for a project |
| `POST` | `/sessions` | Bearer JWT | Create a new live review proxy session |
| `GET` | `/sessions/{session_id}` | Bearer or Guest Token | Get session metadata, active URL, and snapshot status |
| `PATCH`| `/sessions/{session_id}` | Bearer JWT | Update session properties (e.g. `conservative_render_mode`) |
| `GET` | `/sessions/{session_id}/page-visits` | Bearer or Guest Token | List recorded navigation history inside session |
| `GET` | `/sessions/{session_id}/dom-edits` | Bearer or Guest Token | List session visual DOM mutations |
| `POST` | `/sessions/{session_id}/dom-edits` | Bearer or Guest Token | Append a visual CSS/text DOM mutation |
| `DELETE`|`/sessions/{session_id}/dom-edits/{edit_id}` | Bearer JWT | Delete a visual DOM mutation |

#### `POST /sessions/{session_id}/dom-edits`
- **Request Body (`DOMEditCreate`)**:
  ```json
  {
    "selector": "#hero-heading",
    "xpath": "/html/body/div[1]/h1",
    "property": "font-size",
    "old_value": "32px",
    "new_value": "44px",
    "page_url": "https://client-staging.example.com/"
  }
  ```

---

## 6. Blueprint Canvas Domain

### 6.1 Spatial Canvas Elements (`/canvas`)
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/canvas/{project_id}/frames` | Bearer JWT | List all spatial canvas frames in project |
| `POST` | `/canvas/{project_id}/frames` | Bearer JWT | Create a canvas frame (artboard/viewport) |
| `PATCH`| `/canvas/{project_id}/frames/{frame_id}`| Bearer JWT | Update frame position (x, y), dimensions, or URL |
| `DELETE`|`/canvas/{project_id}/frames/{frame_id}`| Bearer JWT | Delete a canvas frame |
| `GET` | `/canvas/{project_id}/flows` | Bearer JWT | List frame connectors and visual flow arrows |
| `POST` | `/canvas/{project_id}/flows` | Bearer JWT | Connect two frames with a navigational flow |

### 6.2 Blueprint DOM Edit Sets (`/projects/{project_id}/blueprint`)
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects/{project_id}/blueprint/frames/{frame_id}/dom-target` | Bearer JWT | Get DOM target mapping for a canvas frame |
| `PUT` | `/projects/{project_id}/blueprint/frames/{frame_id}/dom-target` | Bearer JWT | Upsert DOM target mapping for a canvas frame |
| `GET` | `/projects/{project_id}/blueprint/frames/{frame_id}/edit-sets` | Bearer JWT | List versioned DOM edit sets for a frame |
| `POST` | `/projects/{project_id}/blueprint/frames/{frame_id}/edit-sets` | Bearer JWT | Create a versioned DOM edit set |
| `POST` | `/projects/{project_id}/blueprint/edit-sets/{set_id}/operations`| Bearer JWT | Add an atomic CSS mutation to an edit set |
| `GET` | `/projects/{project_id}/blueprint/summary` | Bearer JWT | Fetch AI-generated architectural summary |

---

## 7. Proxy Engine Domain (`/proxy`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/proxy/session/{session_id}` | Cookie or None | Proxy entrypoint; initializes session cookie and redirects |
| `GET` | `/proxy/session/{session_id}/page` | Cookie or None | Fetches target HTML, executes `rewrite_html`, and streams response |
| `GET/POST`| `/proxy/session/{session_id}/asset/{scheme}/{host}/{path:path}` | None | Proxies binary/text asset with SSRF checks & memory cache |
| `DELETE`|`/proxy/session/{session_id}/cache` | Bearer JWT | Purges in-memory asset cache for session |

---

## 8. Markers & Collaboration Domain (`/markers`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/markers` | Bearer or Guest Token | List markers for a session with optional status/type filter |
| `POST` | `/markers` | Bearer or Guest Token | Create a review marker with DOM or viewport anchor |
| `PATCH`| `/markers/{marker_id}` | Bearer or Guest Token | Update marker status (`open`, `in_progress`, `resolved`), priority, or title |
| `DELETE`|`/markers/{marker_id}` | Bearer or Guest Token | Soft-delete a marker |
| `POST` | `/markers/{marker_id}/comments` | Bearer or Guest Token | Add a reply comment to a marker thread |

#### `POST /markers`
- **Request Body (`MarkerCreate`)**:
  ```json
  {
    "session_id": "92457c49-1362-4749-b2cf-8267360c2779",
    "page_url": "https://client-staging.example.com/pricing",
    "anchor_kind": "dom-relative",
    "target_selector": "button.cta-primary",
    "target_xpath": "/html/body/div[2]/button",
    "dom_text_excerpt": "Upgrade Now",
    "offset_x_ratio": 0.5,
    "offset_y_ratio": 0.5,
    "title": "Button CTA misaligned",
    "description": "Button overflows container on tablet viewports.",
    "priority": "high",
    "issue_type": "layout"
  }
  ```

---

## 9. Billing & Plans Domain (`/billing`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/billing/status` | Bearer JWT | Returns current subscription plan, quotas, and limits |
| `POST` | `/billing/checkout` | Bearer JWT | Create Dodo Payments hosted checkout session |
| `POST` | `/billing/webhook` | Webhook Signature | Ingests Dodo subscription and payment events |
| `GET` | `/billing/early-bird` | None | Returns remaining early bird quota count (capped at 100) |

---

## 10. Realtime WebSocket Protocols

### 10.1 Session Review Collaboration (`/ws/sessions/{session_id}`)
- **Connection URL**: `/ws/sessions/{session_id}?actor_id={id}&actor_role={role}&client_kind=browser`
- **Client ➔ Server Frames**:
  - `ping` (text) or `{"type": "heartbeat"}`: Liveness check. Server replies with `pong` or `{"status": "ack"}`.
  - `{"type": "session_snapshot_requested"}`: Request full marker array.
- **Server ➔ Client Frames**:
  - `{"type": "session_reconciled", "data": {"status": "ready", "connection_count": 3}}`
  - `{"type": "presence_updated", "data": {"participants": [...]}}`
  - `{"type": "marker_created", "data": {"marker": {...}}}`
  - `{"type": "marker_updated", "data": {"marker": {...}}}`
  - `{"type": "marker_deleted", "data": {"marker_id": "..."}}`

### 10.2 Blueprint Spatial Multiplayer (`/ws/canvas/{project_id}`)
- **Connection URL**: `/ws/canvas/{project_id}?user_id={id}&name={name}&color={hex}`
- **Client ➔ Server Frames**:
  - `{"type": "cursor_move", "x": 120.5, "y": 450.0, "frame_id": "f_123"}`
  - `{"type": "selection_change", "frame_id": "f_123", "target_selector": "header > h1"}`
- **Server ➔ Client Broadcast**: Relayed to all peers connected to the canvas.
