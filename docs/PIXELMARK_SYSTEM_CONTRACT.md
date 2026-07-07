# PixelMark Authoritative System Reference Contract

This document serves as the authoritative reference contract for PixelMark's visual feedback, QA review, and proxy-injected feedback platform. It details the exact specifications of the FastAPI backend, Next.js frontend, WebSocket realtime synchronization layer, database schemas, proxy routing middleware, and client Zustand state stores.

---

## 1. System Overview

PixelMark is a collaborative QA review and visual feedback platform. It allows developers to import websites into isolated "Review Sessions," wherein public reviewers (or developers) can drop comment pins directly onto DOM nodes or canvas frames, modify elements' styles in real-time, capture screenshots, and sync presence indicators over a WebSocket layer.

### High-Level Architecture

```
                               ┌────────────────────────┐
                               │   Next.js Frontend     │
                               │  (Zustand State Stores)│
                               └───────────┬────────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                     HTTP  │           WebSocket  │             HTTP │ (Proxy)
                        ▼                  ▼                  ▼
             ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
             │ FastAPI Router   │ │ WebSocket Router │ │ Proxy Middleware │
             │ (API Routes/Auth)│ │  (Realtime Sync) │ │ (Agent/CSS Inject│
             └──────────┬───────┘ └────────┬─────────┘ └────────┬─────────┘
                        │                  │                    │
                        │             ┌────▼─────────┐          │
                        │             │ Redis Pub/Sub│          │
                        │             └────┬─────────┘          │
                        │                  │                    │
                        └─────────┬────────┴────────────────────┘
                                  ▼
                     ┌────────────────────────┐
                     │ PostgreSQL Database    │
                     │    (Neon Serverless)   │
                     └────────────────────────┘
```

### Deployment Topology
* **Frontend Host:** Next.js deployed on Vercel.
* **Backend Host:** FastAPI service deployed on Railway.
* **Database Host:** PostgreSQL instance deployed on Neon.
* **Pub/Sub Layer:** Redis server (used for inter-process WebSocket synchronization).

### Subsystem Maturity/Stability Notes
* **Stable Core:** Authentication (JWT and GitHub OAuth), Projects CRUD, Sessions Lifecycle, and Markers CRUD.
* **Fragile/Complex:** Proxy Fallback Middleware and URL Rewriting (susceptible to CORS/CSP rules, Next.js hydration mismatches, and SSRF restrictions).
* **Partially Stubbed/In-Progress [UNVERIFIED]:** Server-Side Playwright screenshot capture (frequently falls back to frontend client-side rendering or placeholders when network restrictions block chromium).

---

## 2. Backend Entry Point & Lifecycle

The main entry point for the FastAPI application is located in `backend/main.py`.

### Startup Lifespan & Lifecycle
The lifespan event handler performs key startup checks and connection recovery logic:
1. **GitHub OAuth Configuration Check:** Checks if `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are configured. In non-testing environments, the backend raises a `ValueError` and halts if they are missing.
2. **Neon Database Reconnection Loop:** Attempts to establish a connection to PostgreSQL (Neon DB). The retry loop has a maximum of **5 attempts** with an exponential backoff delay starting at **3 seconds** (multiplied by `1.5` on each failure). If all 5 attempts fail, the application terminates.
3. **Database Schema Verification:** Runs `Base.metadata.create_all` at startup to automatically create any missing tables.

### CORS Configuration
CORS middleware is registered with the following settings:
* **Allowed Origins:** `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000`, `http://127.0.0.1:8765`, `http://localhost:8765`, `https://tailwindcss.com`.
* **Allowed Origin Regex:** `https://.*\.tailwindcss\.com` (supports Tailwind's custom play sandboxes).
* **Credentials Support:** `allow_credentials=True` (permits sending authentication cookies like `pm_token` or `pixelmark_session_id`).
* **HTTP Methods & Headers:** Wildcard `["*"]` is specified, allowing all verbs and headers.

### Proxy Fallback Middleware
The HTTP middleware `proxy_fallback_middleware` intercepts all incoming requests to the backend server.

1. **Reserved Prefixes:** Paths starting with the following prefixes are passed directly to the standard FastAPI router and **bypass** proxy interception:
   * `/auth`, `/projects`, `/sessions`, `/markers`, `/canvas`, `/shares`, `/proxy`, `/export`, `/websocket`, `/health`, `/metrics`, `/static`, `/docs`, `/openapi.json`, `/share-links`, `/review`, `/ai`, `/waitlist`, `/settings`
2. **Interception & Context Extraction:** For all other request paths, the middleware determines the context Session ID using this search order:
   * Extracts from the `referer` header matching `/proxy/session/([a-f0-9\-]{36})`.
   * Extracts from the cookie `pixelmark_session_id`.
   * Fallback to the active IP session mapping dictionary (`ACTIVE_IP_SESSIONS` mapping client IP to session ID).
3. **SSRF Guarding:** Target domains must resolve to SSRF-safe public IPs. Private IP ranges, localhost, and loopbacks are rejected with a `403 Forbidden` response.
4. **Resolution Strategies & Asset Rewriting:**
   * **Next.js static assets (`/_next/`)** are unconditionally proxied to the target host with headers stripped of host and encoding to bypass compression.
   * **RSC Requests:** Intercepts Next.js React Server Component requests (`rsc` headers) and streams them back using `StreamingResponse`.
   * **HTML Documents:** Rewritten on the fly by injecting the `pixelmark-agent.js` and exposing variables (Session ID, Logical Target URL, base path) on `window.__PIXELMARK__`. It also automatically enables `conservative_render_mode` on the Session model if Next.js signatures are detected.
   * **Standard Static Assets:** Cached in-memory to improve load speed. Response headers `x-frame-options`, `content-security-policy`, and `access-control-allow-origin` are explicitly stripped to prevent iframe loading errors.

---

## 3. Database Models

The database tables are built using SQLAlchemy 2.0 mapped columns.

### SQLAlchemy Model Field Details

| Table Name | Model Name | Field Name | Type | Constraints / Cascade / Defaults | Nullable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **users** | `User` | `id` | `String` | Primary Key, default UUID | No |
| | | `email` | `String` | Unique, Index | No |
| | | `hashed_password` | `String` | | No |
| | | `name` | `String` | | Yes |
| | | `created_at` | `DateTime` | Server default `now()` | No |
| | | `is_verified` | `Boolean` | Default `False` | No |
| | | `verification_token`| `String` | | Yes |
| | | `reset_token` | `String` | | Yes |
| **user_ai_provider_configs** | `UserAIProviderConfig` | `id` | `String` | Primary Key | No |
| | | `user_id` | `String` | ForeignKey(`users.id`), cascade delete-orphan | No |
| | | `provider` | `String` | | No |
| | | `display_name` | `String` | | Yes |
| | | `encrypted_api_key` | `Text` | | Yes |
| | | `base_url` | `String` | | Yes |
| | | `model_name` | `String` | | Yes |
| | | `is_active` | `Boolean` | Default `True` | No |
| | | `is_default` | `Boolean` | Default `False` | No |
| **organizations** | `Organization` | `id` | `String` | Primary Key | No |
| | | `name` | `String` | | No |
| | | `slug` | `String` | Unique | No |
| **org_members** | `OrgMember` | `id` | `String` | Primary Key | No |
| | | `org_id` | `String` | ForeignKey(`organizations.id`) | No |
| | | `user_id` | `String` | ForeignKey(`users.id`) | No |
| | | `role` | `Enum(RoleEnum)`| Default `member` | No |
| **projects** | `Project` | `id` | `String` | Primary Key | No |
| | | `org_id` | `String` | ForeignKey(`organizations.id`) | No |
| | | `name` | `String` | Length <= 255 | No |
| | | `url` | `String` | Must start with `http(s)://` | Yes |
| **canvas_frames** | `CanvasFrame` | `id` | `String` | Primary Key | No |
| | | `project_id` | `String` | ForeignKey(`projects.id`, ondelete="CASCADE") | No |
| | | `session_id` | `String` | ForeignKey(`sessions.id`, ondelete="SET NULL") | Yes |
| | | `title` | `String` | | No |
| | | `position_x` | `Float` | Default `0.0` | No |
| | | `position_y` | `Float` | Default `0.0` | No |
| | | `width` | `Float` | Default `320.0` | No |
| | | `height` | `Float` | Default `200.0` | No |
| | | `color` | `String` | Default `#1c1b19` | No |
| | | `snapshot_url` | `String` | | Yes |
| **canvas_flows** | `CanvasFlow` | `id` | `String` | Primary Key | No |
| | | `project_id` | `String` | ForeignKey(`projects.id`, ondelete="CASCADE") | No |
| | | `source_frame_id`| `String` | ForeignKey(`canvas_frames.id`, ondelete="CASCADE")| No |
| | | `target_frame_id`| `String` | ForeignKey(`canvas_frames.id`, ondelete="CASCADE")| No |
| | | `label` | `String` | | Yes |
| **environments** | `Environment` | `id` | `String` | Primary Key | No |
| | | `project_id` | `String` | ForeignKey(`projects.id`) | No |
| | | `name` | `String` | e.g. "dev", "staging", "prod" | No |
| | | `base_url` | `String` | | No |
| **sessions** | `Session` | `id` | `String` | Primary Key | No |
| | | `project_id` | `String` | ForeignKey(`projects.id`, cascade delete-orphan) | No |
| | | `title` | `String` | | Yes |
| | | `current_page_url`| `String` | | Yes |
| | | `pages_visited_count`| `Integer` | Column name `pages_visited`, default `0` | Yes |
| | | `renderer_type` | `String` | | Yes |
| | | `heavy_mode` | `Boolean` | Default `False` | Yes |
| | | `conservative_render_mode`| `Boolean`| Default `False` (forces iframe style freeze) | Yes |
| | | `status` | `String` | Default `"active"`, values: `"active"`, `"idle"`, `"closed"` | No |
| | | `last_heartbeat_at`| `DateTime` | | Yes |
| **page_visits** | `PageVisit` | `id` | `String` | Primary Key | No |
| | | `session_id` | `String` | ForeignKey(`sessions.id`, cascade delete-orphan) | No |
| | | `share_link_id` | `String` | ForeignKey(`share_links.id`, ondelete="SET NULL") | Yes |
| | | `page_url` | `String` | Index | No |
| | | `page_title` | `String` | | Yes |
| | | `visited_at` | `DateTime` | Server default `now()` | No |
| | | `visit_count` | `Integer` | Default `1` | Yes |
| **share_links** | `ShareLink` | `id` | `String` | Primary Key | No |
| | | `session_id` | `String` | ForeignKey(`sessions.id`, ondelete="CASCADE") | No |
| | | `token` | `String` | Unique index, URL safe token | No |
| | | `label` | `String` | Default `"Shared Link"` | Yes |
| | | `can_comment` | `Boolean` | Default `True` | No |
| | | `is_active` | `Boolean` | Default `True` | No |
| | | `password_hash` | `String` | | Yes |
| | | `expires_at` | `DateTime` | | Yes |
| | | `accessed_count` | `Integer` | Default `0` | No |
| | | `role` | `String` | Default `"tester"` | Yes |
| | | `max_uses` | `Integer` | | Yes |
| | | `use_count` | `Integer` | Default `0` | No |
| **dom_edits** | `DOMEdit` | `id` | `UUID` | Primary Key, default UUID4 | No |
| | | `session_id` | `String` | ForeignKey(`sessions.id`, ondelete="CASCADE") | No |
| | | `selector` | `String` | DOM selector path | No |
| | | `xpath` | `String` | | Yes |
| | | `property` | `String` | CSS style property modified | No |
| | | `old_value` | `String` | | Yes |
| | | `new_value` | `String` | | Yes |
| | | `element_tag` | `String` | e.g. "DIV", "BUTTON" | Yes |
| | | `element_text` | `String(80)`| Inner text preview | Yes |
| | | `page_url` | `String` | | No |
| **api_keys** | `ApiKey` | `id` | `String` | Primary Key | No |
| | | `user_id` | `String` | ForeignKey(`users.id`, ondelete="CASCADE") | No |
| | | `name` | `String` | Friendly label | No |
| | | `token_hash` | `String` | Unique index | No |
| | | `masked_token` | `String` | e.g., `"pix_live_...xxxx"` | No |
| | | `created_at` | `DateTime` | Server default `now()` | No |
| | | `last_used_at` | `DateTime` | | Yes |
| | | `revoked_at` | `DateTime` | | Yes |
| **markers** | `Marker` | `id` | `String` | Primary Key | No |
| | | `project_id` | `String` | ForeignKey(`projects.id`, ondelete="CASCADE") | No |
| | | `session_id` | `String` | ForeignKey(`sessions.id`, ondelete="CASCADE") | No |
| | | `page_visit_id` | `String` | ForeignKey(`page_visits.id`, ondelete="SET NULL") | Yes |
| | | `creator_id` | `String` | | Yes |
| | | `creator_name` | `String` | Displays initials or custom review names | Yes |
| | | `creator_role` | `String` | `"developer"` or `"reviewer"` | Yes |
| | | `color_token` | `String` | Curated palette color name or hex code | Yes |
| | | `anchor_kind` | `String` | `"dom"` or `"canvas"` | No |
| | | `anchor_mode` | `String` | Default `"dom"` | No |
| | | `page_url` | `String` | URL where the marker was dropped | Yes |
| | | `target_selector`| `String` | DOM query selector path | Yes |
| | | `target_xpath` | `String` | XPath fallback | Yes |
| | | `dom_text_excerpt`| `Text` | Text context of node | Yes |
| | | `offset_x_ratio` | `Float` | Click relative X ratio to element width | Yes |
| | | `offset_y_ratio` | `Float` | Click relative Y ratio to element height | Yes |
| | | `viewport_x` | `Float` | Click viewport relative X coordinate | Yes |
| | | `viewport_y` | `Float` | Click viewport relative Y coordinate | Yes |
| | | `page_x` | `Float` | Click document page relative X coordinate | Yes |
| | | `page_y` | `Float` | Click document page relative Y coordinate | Yes |
| | | `viewport_width` | `Float` | Viewport width at drop time | Yes |
| | | `viewport_height`| `Float` | Viewport height at drop time | Yes |
| | | `element_rect_json`| `JSON` | Bounding client rect dict of target element | Yes |
| | | `scroll_x` | `Float` | Page scroll offset X | Yes |
| | | `scroll_y` | `Float` | Page scroll offset Y | Yes |
| | | `canvas_id` | `String` | Canvas element selector | Yes |
| | | `canvas_x_ratio` | `Float` | | Yes |
| | | `canvas_y_ratio` | `Float` | | Yes |
| | | `renderer_type` | `String` | `"standard"` / `"three"` / `"canvas2d"` | Yes |
| | | `title` | `String` | | Yes |
| | | `description` | `String` | | Yes |
| | | `status` | `String` | Default `"open"`, values: `"open"`, `"in_progress"`, `"resolved"`| No |
| | | `priority` | `String` | Default `"medium"`, values: `"critical"`, `"high"`, `"medium"`, `"low"`| No |
| | | `is_deleted` | `Boolean` | Default `False` | No |
| | | `version` | `Integer` | Default `1` (incremented on updates) | No |
| | | `screenshot_url` | `String` | Base64 data URI or host path | Yes |
| **reviewer_identities**| `ReviewerIdentity`| `id` | `String` | Primary Key | No |
| | | `session_id` | `String` | ForeignKey(`sessions.id`, ondelete="CASCADE") | No |
| | | `display_name` | `String` | Display name entered on gate screen | No |
| | | `color_token` | `String` | Curated color matching their pin color | No |
| | | `role` | `String` | Default `"reviewer"` | No |
| | | `created_at` | `DateTime` | Server default `now()` | No |
| | | `last_seen_at` | `DateTime` | Updated on WebSocket traffic | Yes |

### Schema Drift Note
The database does not match the models. Columns like `Marker.page_visit_id` and `Marker.version` were added dynamically via raw SQL migration scripts (`enhanced_core_migration.py`), skipping Alembic. If you clean and re-create the database using only standard model metadata, the app might crash due to schema drift.

---

## 4. Full API Route Inventory

### Auth Routes (`/auth`)

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/auth/register` | None | `{email, password, name}` | `{message, dev_link, access_token, token_type, user}` | `201` Created, `409` Conflict (email exists) |
| **POST** | `/auth/verify-email` | None | Query parameter: `token` | `{message}` | `200` OK, `400` Expired/Invalid token |
| **POST** | `/auth/login` | None | `{email, password}` | `{access_token, token_type, user}` | `200` OK, `401` Unauthorized, `403` Email unverified |
| **POST** | `/auth/request-password-reset` | None | `{email}` | `{message, dev_link}` | `200` OK (always returns 200 for security) |
| **POST** | `/auth/reset-password` | None | `{token, password}` | `{message}` | `200` OK, `400` Expired/Invalid token |
| **GET** | `/auth/me` | JWT | None | `{id, email, name, created_at, is_verified}` | `200` OK, `401` Unauthorized |

### Project Routes (`/projects`)

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/projects/` | JWT | `{name, url, description}` | `{id, name, url, created_at, org_id}` | `201` Created, `422` Validation (invalid scheme/empty) |
| **GET** | `/projects/` | JWT | None | `List[ProjectOut]` | `200` OK (uses 30-second in-memory cache) |
| **GET** | `/projects/dashboard/summary` | JWT | None | `{total_projects, total_sessions, total_markers, open_issues}` | `200` OK (uses 15-second in-memory cache) |
| **GET** | `/projects/{project_id}` | JWT | None | `{id, name, url, created_at, org_id}` | `200` OK, `422` Invalid UUID, `404` Not found |
| **PATCH**| `/projects/{project_id}` | JWT | `{name, url}` | `{id, name, url, created_at, org_id}` | `200` OK, `404` Not Found, `422` Invalid UUID |
| **DELETE**| `/projects/{project_id}` | JWT | None | `{deleted: true}` | `200` OK, `404` Not Found, `422` Invalid UUID |

### Session Routes (`/sessions` & `/shares`)

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/sessions/` | JWT | `{project_id, title}` | `SessionOut` | `200` OK (recycles session if active within 5m), `201` Created |
| **GET** | `/sessions/` | JWT | None | `List[SessionOut]` | `200` OK |
| **POST** | `/sessions/{session_id}/heartbeat`| None | None | `{status: "ack"}` | `200` OK, `404` Session not found |
| **POST** | `/sessions/{session_id}/renderer` | None | `{renderer_type, has_canvas, canvas_count, raf_detected, three_detected}` | `{status: "updated"}` | `200` OK |
| **POST** | `/sessions/{session_id}/screenshot`| None | Query parameter: `target_url` | `{screenshot_url, status}` | `200` OK (triggers Playwright screenshot fallback) |
| **POST** | `/shares/project/{project_id}` | JWT | `{role, password, expires_in_days, max_uses, label}` | `ShareLinkOut` | `200` OK, `201` Created (creates link for latest session) |
| **GET** | `/shares/project/{project_id}` | JWT | None | `List[ShareLinkOut]` | `200` OK |
| **POST** | `/shares/access/{token}` | None | `{password}` | `{session_id, title, can_comment, role, project_id, name, url}` | `200` OK, `403` Bad password, `410` Expired/Revoked |

### Marker Routes (`/markers`)

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/sessions/{session_id}/markers` | None / Reviewer | Query parameters (filters) | `List[MarkerRead]` | `200` OK (returns full markers with viewport coords) |
| **POST** | `/sessions/{session_id}/markers` | None / Reviewer | `MarkerCreate` schema | `MarkerRead` | `200` OK, `404` Session not found, `422` Project mismatch |
| **PATCH**| `/markers/{marker_id}` | None / Reviewer | `{title, description, status, priority, color_token}` | `MarkerRead` | `200` OK, `404` Not found, `409` Outdated version check |
| **PATCH**| `/markers/{marker_id}/position` | None / Reviewer | `{offset_x_ratio, offset_y_ratio, viewport_x, viewport_y, scroll_x, scroll_y}` | `MarkerRead` | `200` OK, `409` Version conflict |
| **DELETE**| `/markers/{marker_id}` | None / Reviewer | None | `{success: true, message: "..."}` | `200` OK, `404` Stale delete |

### DOM Edit / CSS Change Routes

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/sessions/{session_id}/dom-edits` | JWT / ShareToken | `DOMEditCreate` | `DOMEditRead` | `200` OK, `401` Missing credentials, `403` Invalid token |
| **GET** | `/sessions/{session_id}/dom-edits` | JWT / ShareToken | None | `Dict[str, List[DOMEditRead]]` | `200` OK, `404` Session not found |
| **DELETE**| `/sessions/{session_id}/dom-edits` | JWT / ShareToken | None | `{status: "deleted", deleted_count}` | `200` OK, `403` Owner access required |
| **GET** | `/sessions/{session_id}/dom-edits/export/css` | None | None | CSS file (plain text) | `200` OK (compiles and returns standard CSS rules) |

### AI Routes [DISABLED STUBS / SHELL ONLY]

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/ai/triage/session/{session_id}` | JWT | None | `{detail: "Marker system temporarily..."}` | `400` Bad Request (stubbed disabled endpoint) |
| **GET** | `/ai/summary/session/{session_id}` | JWT | None | `{detail: "Marker system temporarily..."}` | `400` Bad Request (stubbed disabled endpoint) |

### Share Link Token Resolution Routes

| Method | Path | Auth Required | Request Shape | Response Shape | Status Trigger Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/resolve-token/{token}` | None | `{password}` | `{session_id, title, can_comment, role, id, project_id, name, project_name, url, target_url, token}` | `200` OK, `403` Forbidden, `404` Not Found, `410` Expired/Revoked |

---

## 5. Authentication & Authorization Model

PixelMark uses two authentication systems: **Developer Auth** (JWT-based) and **Reviewer Auth** (session-scoped).

### Developer Auth (JWT)
* **Token Structure:** JWT contains a standard payload: `{"sub": user_id, "exp": expiration_timestamp}`.
* **Token Generation:** Issued on `/auth/login` or via the OAuth callback.
* **Frontend Storage:** Stored in a cookie named `pm_token` and duplicated in Zustand `authStore` memory.
* **Injection:** Injected into every API request header as `Authorization: Bearer <token>`.
* **Edge Middleware Guard (`middleware.ts`):** Checks for the existence of `pm_token` before routing to `/projects`, `/project`, `/dashboard`, `/settings`, or `/sessions`. Redirects back to `/login` if missing.

### Reviewer Auth (Public Review Links)
* **Access Link:** Accessible via public token landing pages: `/t/{token}`.
* **Name Gate:** Reviewers enter their name on `ReviewerNameGate.tsx`. The frontend makes a `POST` request to `/sessions/{session_id}/reviewer-identities` to save the reviewer.
* **Frontend Storage:** The reviewer's registered display name, color token, and ID are persisted in **`localStorage`** under the keys `pm:reviewer:identity` (for global reuse) and `pm:reviewer:{session_id}` (for session fallback), via `setStoredReviewerIdentity`.
* **Header Mapping:** For all marker creation, update, and deletion requests, the frontend injects the Reviewer ID into the custom header **`X-Reviewer-Id`**.
* **Backend Resolution:** The backend dependency `get_session_actor` checks `X-Reviewer-Id`. It retrieves the identity record from the database and maps operations to that reviewer. If the header is missing, it falls back to `"Anonymous Reviewer"`.

---

## 6. WebSocket / Realtime Architecture

Real-time changes are synchronized across client connections using WebSockets and Redis.

### WebSocket Endpoint URL Pattern
* Authoritative Route: `ws://<backend_host>/ws/sessions/{session_id}?actor_id=<id>&actor_role=<role>&client_kind=<kind>`
* Backward-compatible Route: `ws://<backend_host>/ws/session/{session_id}?actor_id=<id>&actor_role=<role>&client_kind=<kind>`

### Connection lifecycle
1. **Connection and Subscription:** When a client opens a connection, the `ConnectionManager` subscribes the socket to a Redis Pub/Sub channel keyed to the `session_id`.
2. **Reconciliation Event:** The server immediately returns a `session_reconciled` event containing a `"status": "ready"` payload.
3. **Presence Update:** The server broadcasts a `presence_updated` message containing the list of all currently connected developers and registered reviewers.
4. **Heartbeat:** The client sends `"ping"` text frames every **30 seconds**; the server replies with `"pong"`. If a client misses a heartbeat, the socket is closed and the client is marked offline.

### Redis Connection Recovery & Degraded Fallback
* **Reconnection Handling:** The backend `RedisBroadcaster` connects to Redis using an `aioredis.ConnectionPool` with `health_check_interval=30`. 
* **Connection Drops:** If a connection fails during the subscription loop, the thread catches `ConnectionError` or `TimeoutError`, marks the connection `self.redis = None` (triggering a reconnect on the next tick), sleeps with exponential backoff (starting at 1s, capped at 30s), and attempts to re-establish the subscription.
* **Degraded Single-Instance Fallback:** If a message cannot be published to Redis because the server is unreachable, the system catches the exception and falls back to **direct local broadcasting** (`realtime_manager.broadcast_to_session_local`) on the current FastAPI instance.
* **Out-of-Sync / Double Delivery Risks:** Because local publishing is routed solely through Redis (relying on the local subscriber loop to receive and broadcast the message to its own client), double delivery is avoided. However, if one or more server nodes degrade to direct local broadcasting while others continue routing through Redis, clients connected across different instances will lose synchronicity, resulting in transient local state forks.

### Event Payload Contracts

#### `presence_updated`
```json
{
  "type": "presence_updated",
  "session_id": "80e34c1b-e5fc-427f-94d3-e7f09315d18d",
  "data": {
    "participants": [
      {
        "id": "reviewer-id-uuid",
        "name": "Jane Reviewer",
        "role": "reviewer",
        "color_token": "violet",
        "is_online": true,
        "last_seen_at": "2026-07-06T19:54:10Z"
      }
    ]
  }
}
```

#### `marker_created` / `marker_updated` / `marker_moved` / `marker_resolved`
```json
{
  "type": "marker_created",
  "session_id": "80e34c1b-e5fc-427f-94d3-e7f09315d18d",
  "marker_id": "f6b8b893-c708-414c-8b3e-b673b8fe046f",
  "actor_id": "user-uuid",
  "actor_role": "developer",
  "data": {
    "marker": {
      "id": "f6b8b893-c708-414c-8b3e-b673b8fe046f",
      "project_id": "proj-uuid",
      "session_id": "80e34c1b-e5fc-427f-94d3-e7f09315d18d",
      "anchor_kind": "dom",
      "page_url": "https://target-site.com/dashboard",
      "target_selector": "body > div > button",
      "offset_x_ratio": 0.45,
      "offset_y_ratio": 0.12,
      "viewport_x": 120,
      "viewport_y": 340,
      "viewport_width": 1920,
      "viewport_height": 1080,
      "title": "Style Mismatch",
      "description": "Button is misaligned",
      "status": "open",
      "priority": "medium",
      "version": 1,
      "is_deleted": false,
      "created_at": "2026-07-06T19:53:49Z"
    }
  }
}
```

---

## 7. Proxy / Injection System

PixelMark displays target websites inside an iframe by proxying asset requests.

### Injection Logic
When the proxy loads a target page, it rewrites the HTML document by injecting a bootstrap script block at the top of the `<head>` element. This bootstrap block:
1. Defines global variables: `window.__PIXELMARK_SESSION_ID__`, `window.__PIXELMARK_PROXY_ORIGIN__`, and `window.__PIXELMARK_TARGET_URL__`.
2. Hooks properties on global prototypes (`HTMLLinkElement.prototype.href`, `HTMLScriptElement.prototype.src`, and `HTMLImageElement.prototype.src`) to redirect request URLs through the `/proxy/session/{session_id}/asset?url=` rewrite endpoint.
3. Overrides `window.fetch` and `XMLHttpRequest.prototype.open` to route API calls through the session proxy.
4. Shims `History.prototype.pushState` and `History.prototype.replaceState` to intercept SPA navigation, allowing page visits to be recorded on the backend.

### Security Boundaries
* **SSRF Protection:** All outgoing proxy HTTP requests pass through `is_ssrf_safe`, which blocks internal hostnames, localhost, loopbacks, and private IP blocks (RFC 1918).
* **Scope Locking:** The helper `is_domain_allowed` ensures redirected links stay within the target project's domain boundaries. External redirect attempts return a blank `204 No Content` response.

---

## 8. Marker / Feedback Data Flow

```
 ┌──────────────────────┐      postMessage      ┌───────────────────────┐
 │ Injected IFrame Agent│ ────────────────────> │  Parent IFrame Shell  │
 │ (Click coordinates,  │                       │ (Normalizes click grid│
 │ selector, DOM text)  │                       │  & resolves target)   │
 └──────────────────────┘                       └───────────┬───────────┘
                                                            │
                                                            ▼
 ┌──────────────────────┐      HTTP POST        ┌───────────────────────┐
 │ PostgreSQL Database  │ <──────────────────── │  Zustand Marker Store │
 │ (Commits Marker row) │                       │ (Optimistic local pin)│
 └──────────┬───────────┘                       └───────────────────────┘
            │
            │ Redis Event / PubSub
            ▼
 ┌──────────────────────┐      WS Broadcast     ┌───────────────────────┐
 │ WebSocket Router     │ ────────────────────> │ Connected QA Clients  │
 │ (Authoritative Sync) │                       │ (Updates UI map layers│
 └──────────────────────┘                       └───────────────────────┘
```

### Click Event Payload Structure
When a user clicks on the iframe to drop a pin, the agent posts this coordinate structure back to the parent page:
* `viewport_x` / `viewport_y`: Click coordinate relative to the current iframe window viewport.
* `page_x` / `page_y`: Click coordinate relative to the entire HTML document page height/width.
* `offset_x_ratio` / `offset_y_ratio`: Fractional offset of the click point relative to the target element's bounding rect width and height.
* `target_selector`: Calculated query selector path (e.g. `DIV#app > SECTION.main > BUTTON:nth-child(2)`).
* `target_xpath`: Fallback XML path.
* `dom_text_excerpt`: Plaintext characters surrounding the element node for anchor recovery.
* `scroll_x` / `scroll_y`: Horizontal and vertical scroll offsets at click time.

---

## 9. Screenshot Capture System

PixelMark captures screenshots in three ways:

1. **Element Capture:** Captures the bounding client rect of a target element.
2. **Region Capture:** Captures custom coordinates cropped using a drag-to-select tool.
3. **Fullpage Capture:** Captures a scrolling screenshot of the entire target document page.

### Client-Side Flow
The frontend parent shell requests screen sharing permissions via the browser's `navigator.mediaDevices.getDisplayMedia` API. The video track is captured, drawn onto a hidden `<canvas>`, cropped to the requested coordinates, and exported as a Base64 data URI.

### Server-Side Flow (Playwright Fallback) [UNVERIFIED]
If client-side capture fails, the frontend calls the backend endpoint `/sessions/{session_id}/screenshot?target_url=...`.
* The server verifies that the target domain is allowed.
* It launches a headless Chromium instance using Playwright.
* It navigates to the target page and waits until the network goes idle.
* It takes a screenshot, encodes the raw bytes to a base64 string, and returns it.

---

## 10. Frontend State Architecture

The frontend application uses Zustand stores for state management:

### Zustand Store Roles

* `useMarkerStore`: Manages the single source of truth for all session markers. It handles optimistic UI updates, resolves conflicts using version tracking, and processes incoming real-time WebSocket events.
* `usePinStore`: Manages the local collection of active marker pins.
* `useCaptureStore`: A legacy wrapper that synchronizes with `usePinStore` for backwards-compatibility.
* `useScreenshotStore`: Manages the state of the client-side screen capture stream, media track teardown, crop region dimensions, and screenshot capture status.
* `useRealtimeStore`: Tracks cursor coordinates and online participant indicators.
* `uiStore`: Manages state for the sidebar panel, drawer toggle states, active modes, and zoom levels.

### API Queue Logic (`apiQueue.ts`)
To prevent network request collisions, all API operations are routed through the `apiQueue` client:
* **Write Queue:** Handles create, update, and delete requests sequentially (`WRITE_CONCURRENCY = 1`).
* **Read Queue:** Handles GET requests with a concurrency limit of 4 (`READ_CONCURRENCY = 4`).
* **Exponential Backoff:** If a request fails due to a network connection timeout, the queue retries the request up to **3 times** with backoff delays of 800ms, 1600ms, and 3200ms.

---

## 11. Frontend Route Map

The page files under `web/src/app` define the routing structure:

```
src/app/
├── layout.tsx                 # Root application wrapper
├── page.tsx                   # Marketing landing page
├── favicon.ico
├── (auth)/
│   ├── layout.tsx             # Auth page wrapper
│   ├── login/                 # Sign-in page
│   ├── register/              # Create account page
│   ├── forgot-password/       # Request reset email page
│   └── reset-password/        # Enter new password page
├── (dashboard)/
│   ├── layout.tsx             # Main dashboard shell
│   ├── dashboard/             # Project summary metrics dashboard
│   ├── canvas/                # Canvas mapping whiteboard interface
│   └── sessions/              # Active review sessions list
├── project/
│   └── [id]/                  # Project review sessions and links view
├── projects/
│   ├── new/                   # Create new project page
│   └── page.tsx               # Redirect page (redirects directly to /dashboard)
├── review/
│   └── [token]/               # Public reviewer feedback portal (Name Gate & IFrame view)
└── settings/
    └── page.tsx               # Developer account and API keys settings
```

---

## 12. Export & Reporting

PixelMark exports QA session feedback in three formats:

### Markdown Export
* **Endpoint:** `GET /export/session/{session_id}/markdown`
* **Format:** Returns a plaintext response (`media_type="text/markdown"`) containing:
```markdown
# QA Review Report: {Session Title}
**Session ID:** `80e34c1b-e5fc-427f-94d3-e7f09315d18d`
**Generated At:** 2026-07-06 19:53:49

## Executive Summary
- **Total Markers dropped:** 12
- **Open Issues:** 8
- **Resolved Issues:** 4

## Detailed Feedback Stream
### 1. Title (CRITICAL)
- **Status:** `open`
- **Creator:** John Doe (developer)
- **Target URL:** [url](url)
- **CSS Selector:** `body > div`
- **Screenshot:** [View Image](data:...)

#### Description
Issue description
```

### CSV Export
* **Endpoint:** `GET /export/session/{session_id}/csv`
* **Format:** Returns a plaintext response (`media_type="text/csv"`) with columns:
  `Marker Number, ID, Title, Description, Priority, Status, Creator Name, Creator Role, Page URL, Page Title, Anchor Kind, Renderer Type, Created At, Screenshot URL`

### JSON Export
* **Endpoint:** `GET /export/session/{session_id}/json`
* **Format:** Returns a `JSONResponse` containing an array of markers:
```json
[
  {
    "number": 1,
    "id": "marker-uuid",
    "title": "Button Misaligned",
    "description": "Adjust margins",
    "priority": "medium",
    "status": "open",
    "creator_name": "Reviewer Alice",
    "creator_role": "reviewer",
    "color_token": "violet",
    "anchor_kind": "dom",
    "page_url": "https://opinvox.entrext.com/",
    "page_title": "Opinvox",
    "target_selector": "#submit-btn",
    "target_xpath": "/html/body/button",
    "dom_text_excerpt": "Submit Form",
    "renderer_type": "standard",
    "screenshot_url": "data:image/png;base64,...",
    "created_at": "2026-07-06T19:54:10Z",
    "version": 1
  }
]
```

### Format Query Param Endpoint
* **Endpoint:** `GET /export?project_id={id}&format={markdown|csv|json}`
* **Behavior:** Automatically queries the latest session for the given project, generates the report in the requested format, and returns the response. If no sessions exist for the project, it creates a default session ("Initial Audit Session") first.

---

## 13. Known Issues & Fragile Zones

* **Manual SQL Migrations:** Running migrations via Python scripts like `enhanced_core_migration.py` skips Alembic. Running `db upgrade` on a fresh database will fail to apply these tables, leading to runtime errors.
* **UUID vs. String Comparisons:** Some model UUID fields (e.g. `ReviewerIdentity.session_id` or `DOMEdit.id`) are resolved as Python `uuid.UUID` objects. Comparing these directly to string headers or route parameters without casting to strings will fail.
* **Referer-Header Brittle Resolution:** If a browser extension blocks the `referer` header or if third-party cookies are disabled, the proxy middleware may fail to resolve the session context, causing pages to fail to load in the review shell.
* **Next.js Hydration Mismatches:** Proxying Next.js sites through the iframe can trigger React hydration warnings on the client side, as the injected agent script alters the DOM structure before hydration completes.
* **[UNVERIFIED] GitHub Export Integration:** `github_export.py` and `export_engine.py` files exist in the codebase but are not mounted as routes in `main.py`.
* **[UNVERIFIED] AI Triage/Summary Rebuild:** The AI router endpoints exist as stubs and raise HTTP 400 Bad Request, stating that the marker system has been temporarily removed for a rebuild.
* **[UNVERIFIED] Canvas flows and WHITEBOARD sync:** Canvas flows (`/canvas/flows`) and frames auto-creation are partially wired in `canvasStore.ts`, but layout placement logic and custom labels have not been fully tested in E2E tests.

---

## 14. Explicit "Do Not Touch" Contract for Future UI Work

When performing UI restyling or theme changes, developers must adhere to the following file modification rules:

### Safe to Restyle
These components are presentational and can be styled or redesigned freely:
* Dashboard UI layouts, project metrics cards, settings input fields, navigation bars, buttons, and loading indicators.
* All pure styling rules in `index.css` and `web/src/app/globals.css`.

### Restyle with Caution (Preserve Logic)
The markup structure of these files can be modified, but their underlying state, event handlers, and data bindings must be preserved:
* **Feedback Drawer:** Component logic that binds `DOMEdit` fields, crops screenshots, and sets status/priority levels must remain intact.
* **Review Gate Dialog (`ReviewerNameGate.tsx`):** The input field and submission logic must preserve its data contract.
* **Marker Pins (`MarkerComponents.tsx`):** You can change how pins look, but they must keep their absolute positioning styling:
  `style={{ left: marker.viewport_x, top: marker.viewport_y }}`

### Do Not Touch
The following files contain core platform logic and **must not be modified** during styling updates:
* **API Clients:** `web/src/lib/api.ts` and `web/src/lib/apiQueue.ts`.
* **State Management Stores:** All Zustand stores under `web/src/store/`.
* **Middleware and Routers:** `web/src/middleware.ts` and all Python files under `backend/routes/` and `backend/routers/`.
