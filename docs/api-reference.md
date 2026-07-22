# API Reference

This document maps all discoverable routes, endpoints, request schemas, response formats, and error codes in the STAGE backend.

---

## 1. Authentication Endpoints
- **Path Prefix**: `/auth`
- **Source File**: `backend/routes/auth.py`

### 1.1 POST /auth/register
- **Description**: Registers a new user account, creates a default organization workspace (`{Name}'s workspace`), and creates an owner membership.
- **Auth Required**: None
- **Request Body**:
  ```json
  {
    "email": "fresh_dev_1234@test.com",
    "password": "stage2026",
    "name": "Test Developer"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful. Direct login activated.",
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "23a105fa-4c48-43d9-a72e-067756f7099f",
      "email": "fresh_dev_1234@test.com",
      "name": "Test Developer",
      "created_at": "2026-07-18T00:05:00Z"
    }
  }
  ```
- **Error Codes**:
  - `409 Conflict`: `Email already registered`
  - `422 Unprocessable Entity`: Body validation failures.

---

### 1.2 POST /auth/login
- **Description**: Validates login credentials and returns a signed HS256 access JWT.
- **Auth Required**: None
- **Request Body**:
  ```json
  {
    "email": "fresh_dev_1234@test.com",
    "password": "stage2026"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "23a105fa-4c48-43d9-a72e-067756f7099f",
      "email": "fresh_dev_1234@test.com",
      "name": "Test Developer"
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: `Invalid credentials`
  - `403 Forbidden`: `Please verify your email before signing in.` (if auto-verify is disabled)

---

### 1.3 GET /auth/me
- **Description**: Retrieves details of the currently authenticated user.
- **Auth Required**: HTTP Bearer JWT / API Key
- **Response (200 OK)**:
  ```json
  {
    "id": "23a105fa-4c48-43d9-a72e-067756f7099f",
    "email": "fresh_dev_1234@test.com",
    "name": "Test Developer",
    "created_at": "2026-07-18T00:05:00Z"
  }
  ```

---

### 1.4 POST /auth/firebase-sync
- **Description**: Receives a verified Firebase ID Token, performs a secure REST lookup verification against the Google Identity API, upserts the corresponding User and UserIdentity database records, and issues a standard signed HS256 access JWT for STAGE.
- **Auth Required**: None
- **Request Body**:
  ```json
  {
    "id_token": "eyJhbGciOi...",
    "name": "Test User"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "23a105fa-4c48-43d9-a72e-067756f7099f",
      "email": "fresh_dev_1234@test.com",
      "name": "Test User",
      "created_at": "2026-07-18T00:05:00Z"
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: `Invalid Firebase ID Token`
  - `500 Internal Server Error`: `Firebase API Key is not configured on the backend.`

---

### 1.5 GET /auth/oauth/github/start
- **Description**: Initiates GitHub OAuth authentication. Redirects to GitHub's login site and sets a state CSRF verification cookie.
- **Auth Required**: None
- **Response (307 Temporary Redirect)**: Location header: `https://github.com/login/oauth/authorize?...`
- **Cookie Set**: `oauth_state` (CSRF protection)

---

## 2. Projects Endpoints
- **Path Prefix**: `/projects`
- **Source File**: `backend/routes/projects.py`

### 2.1 POST /projects/
- **Description**: Creates a new project in the user's organization.
- **Auth Required**: Yes (Developer role)
- **Request Body**:
  ```json
  {
    "name": "Acme Landing Page",
    "url": "https://acme.example.com",
    "description": "Marketing website QA audit"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "db20be77-8fa0-4bb8-86bd-90761e9cc981",
    "org_id": "787c88b0-a65c-4da7-9571-70bf81ea42c1",
    "name": "Acme Landing Page",
    "url": "https://acme.example.com",
    "created_at": "2026-07-18T00:05:00Z"
  }
  ```
- **Error Codes**:
  - `422 Unprocessable Entity`: `Project name cannot be empty`, `Invalid target URL scheme`.

---

### 2.2 GET /projects/dashboard/summary
- **Description**: Returns aggregated metrics (projects count, sessions count, issues count). Caches responses in-memory for 15s.
- **Auth Required**: Yes
- **Response (200 OK)**:
  ```json
  {
    "total_projects": 3,
    "total_sessions": 5,
    "total_markers": 12,
    "open_issues": 8
  }
  ```

---

### 2.3 GET /projects/{project_id}/analytics
- **Description**: Returns detailed project metrics: health score, severity counts, resolution rates, and creation activity over the past 7 days. Caches responses for 15s.
- **Auth Required**: Yes
- **Response (200 OK)**:
  ```json
  {
    "health_score": 95,
    "by_severity": { "P0": 0, "P1": 1, "P2": 2, "P3": 0 },
    "open": 3,
    "resolved": 12,
    "total": 15,
    "resolution_rate": 80,
    "activity": [0, 2, 4, 1, 0, 3, 5]
  }
  ```

---

## 3. Session Endpoints
- **Path Prefix**: `/sessions`
- **Source File**: `backend/routes/sessions.py`

### 3.1 POST /sessions/
- **Description**: Initializes an audit session. If an active session for the project was created in the last 5 minutes, it is recycled. Reclaims the oldest active session if organization concurrency exceeds 3. Automatically spawns a `CanvasFrame` inside the database layout.
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "project_id": "db20be77-8fa0-4bb8-86bd-90761e9cc981",
    "title": "Staging Environment Audit"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "e2ba9bcf-7d2d-4cc8-8d4e-d03541785cc3",
    "project_id": "db20be77-8fa0-4bb8-86bd-90761e9cc981",
    "title": "Staging Environment Audit",
    "status": "active",
    "created_at": "2026-07-18T00:05:00Z"
  }
  ```

---

### 3.2 POST /sessions/{session_id}/heartbeat
- **Description**: Registers client pulse. Updates `last_heartbeat_at` and ensures the status is set back to `active`.
- **Auth Required**: None
- **Response (200 OK)**:
  ```json
  {
    "status": "active",
    "last_heartbeat_at": "2026-07-18T00:05:25Z"
  }
  ```

---

### 3.3 POST /sessions/{session_id}/renderer
- **Description**: Updates rendering type variables detected by client hooks (e.g. DOM, Shadow DOM, WebGL, Canvas2D, Three.js).
- **Auth Required**: None
- **Request Body**:
  ```json
  {
    "renderer_type": "threejs",
    "canvas_count": 1,
    "has_canvas": true,
    "raf_detected": true,
    "three_detected": true
  }
  ```
- **Response (200 OK)**: Renderer status is updated inside the database.

---

## 4. Markers Endpoints
- **Path Prefix**: `/sessions/{session_id}/markers` or `/markers`
- **Source File**: `backend/markers/router.py`

### 4.1 POST /sessions/{session_id}/markers
- **Description**: Places a visual bug pin. Binds credentials from the resolved actor context (developers or reviewers). Publishes a realtime broadcast message on success.
- **Headers**:
  - `X-Reviewer-Id`: optional (Reviewer identity uuid)
- **Request Body**:
  ```json
  {
    "project_id": "db20be77-8fa0-4bb8-86bd-90761e9cc981",
    "anchor_kind": "dom-relative",
    "page_url": "https://acme.example.com/pricing",
    "target_selector": "#pricing-grid-card",
    "offset_x_ratio": 0.45,
    "offset_y_ratio": 0.60,
    "title": "Pricing Card spacing",
    "description": "The flex grid layout is broken on mobile viewports.",
    "priority": "critical",
    "browser": "Chrome 120",
    "os": "Windows 11"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "6724a1b0-466c-48c8-89c0-9a84d412bf70",
    "session_id": "e2ba9bcf-7d2d-4cc8-8d4e-d03541785cc3",
    "creator_id": "23a105fa-4c48-43d9-a72e-067756f7099f",
    "creator_name": "Test Developer",
    "creator_role": "developer",
    "color_token": "#4f46e5",
    "anchor_kind": "dom-relative",
    "page_url": "https://acme.example.com/pricing",
    "target_selector": "#pricing-grid-card",
    "offset_x_ratio": 0.45,
    "offset_y_ratio": 0.60,
    "title": "Pricing Card spacing",
    "description": "The flex grid layout is broken on mobile viewports.",
    "status": "open",
    "priority": "critical",
    "created_at": "2026-07-18T00:05:00Z",
    "version": 1
  }
  ```

---

### 4.2 PATCH /markers/{marker_id}
- **Description**: Updates marker details (title, description, status, priority). Performs optimistic version checks.
- **Request Body**:
  ```json
  {
    "title": "Updated Spacing Title",
    "status": "resolved",
    "expected_version": 1
  }
  ```
- **Response (200 OK)**: Returns updated marker (version field increments to 2).
- **Error Codes**:
  - `409 Conflict`: Version mismatch.
  - `403 Forbidden`: Reviewers attempting to modify a developer's marker.

---

## 5. DOM Edits Endpoints
- **Path Prefix**: `/sessions/{session_id}/dom-edits`
- **Source File**: `backend/routers/dom_edits.py`

### 5.1 POST /sessions/{session_id}/dom-edits
- **Description**: Records style edits (CSS property adjustments).
- **Request Body**:
  ```json
  {
    "selector": "h1.title",
    "property": "font-size",
    "old_value": "32px",
    "new_value": "48px",
    "element_tag": "H1",
    "element_text": "Hero Header text",
    "page_url": "https://acme.example.com"
  }
  ```
- **Response (200 OK)**: Returns the saved `DOMEdit` model.

---

### 5.2 GET /sessions/{session_id}/dom-edits/export/css
- **Description**: Compiles all style overrides in a session into a standard `.css` text asset.
- **Response (200 OK - Text/CSS)**:
  ```css
  /* STAGE DOM Edit Export — Session: Staging Environment Audit */
  /* Page: https://acme.example.com */
  h1.title {
    font-size: 48px; /* was: 32px */
  }
  ```

---

## 6. Realtime WebSockets Endpoints
- **Source File**: `backend/realtime/router.py`

### 6.1 WS /ws/sessions/{session_id}
- **Description**: Establishes a persistent JSON-RPC websocket connection for real-time collaboration.
- **Query Parameters**:
  - `actor_id`: reviewer display name or user uuid
  - `actor_role`: `developer` or `reviewer`
  - `client_kind`: optional metadata
- **Supported Client Messages**:
  - `"ping"`: Expects `"pong"` text response (Keep-alive).
  - `{"type": "heartbeat"}`: Expects `{"type": "system_event", "type": "heartbeat", "data": {"status": "ack"}}` response.
  - `{"type": "session_snapshot_requested"}`: Returns a snapshot of all active markers:
    ```json
    {
      "type": "system_event",
      "type": "session_snapshot",
      "data": {
        "generated_at": "2026-07-18T00:05:00Z",
        "markers": [...],
        "connection_count": 2
      }
    }
    ```
- **Broadcast Events Emitted**:
  - `presence_updated`: List of active session members and online states.
  - `marker_created`, `marker_updated`, `marker_moved`, `marker_deleted`: Broadcasted to all peers when a user modifies a marker.
