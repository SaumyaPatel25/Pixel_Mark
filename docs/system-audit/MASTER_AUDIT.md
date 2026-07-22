<!-- ========================================== -->
<!-- FILE: 01-system-overview.md -->
<!-- ========================================== -->

# 01 System Overview

## Product Vision
STAGE is intended to be a visual feedback and developer-collaboration platform designed for website QA/UAT. The platform aims to allow developers to create projects, spawn review sessions, and share public links with reviewers who can leave rich, coordinate-mapped visual feedback (markers) directly on target websites. 

## Current Architecture Summary
The application follows a decoupled client-server architecture:
- **Backend:** FastAPI (Python) application handling REST routes, database access (SQLAlchemy), proxy fallback logic, and WebSockets.
- **Frontend:** Next.js (TypeScript) web application utilizing the App Router.
- **Database:** PostgreSQL (Neon) with SQLAlchemy ORM.
- **Realtime:** FastAPI WebSockets coupled with a broadcast manager for live sync of markers.
- **Hosting/Deployment:** Designed for deployment on Vercel (Frontend) and Railway (Backend).

## Current Actual Maturity Level
- **Overall Status:** *Alpha / Partially Implemented.*
- The core backbone (Auth, Projects, Sessions) is wired and functioning.
- The visual marker collaboration engine exists but is historically unstable (frequent rollbacks, coordinate mapping bugs).
- Several intended features (like AI summaries, advanced exports) are completely missing or just API stubs.
- Local vs. Production parity has suffered from aggressive recent hard-resets, leading to configuration drift (e.g., CORS and hardcoded local URLs persisting into production).

## Major Subsystems
1. **Core API Engine (FastAPI):** Handles Auth, Project management, and Session tracking.
2. **Proxy/Canvas Injector:** Proxies external target websites so they can be injected with the `stage-agent.js` review script, bypassing cross-origin restrictions.
3. **Collaboration Sync (WebSockets):** Handles real-time transmission of marker coordinates and status changes between reviewers and developers.
4. **Web Dashboard (Next.js):** The primary command center for developers.

## Major Risks
- **Coordinate Drift:** Markers created inside an iframe on varying viewports do not consistently map to the developer's canvas view.
- **Auth Brittleness:** Recent commits show a turbulent struggle between NextAuth/OAuth and local mock flows, causing infinite redirects and stale cache issues.
- **Proxy/CORS Complexity:** The application relies on proxying target websites (like Google) through the backend to inject scripts, which is highly brittle against modern framebusting, CSP headers, and CORS restrictions.
- **Code Churn:** The repository has suffered from frequent hard-resets and manual `cherry-pick` rescues, leading to lost bug fixes (like the `description` attribute bug).

## Honest Diagnosis
The repository is a fast-moving, heavily prototyped MVP. While the foundation is solid (FastAPI + Next.js), the advanced functionality (iframe injection, coordinate math, WebSocket sync) is highly fragile. Much of the UI is a functional shell, but edge cases (like multi-user collaboration, robust DB migrations, and production CORS) are poorly handled and prone to breaking during deployments.

---
- **Confidence Level:** High
- **Evidence Source:** Manual inspection of `backend/main.py`, recent git logs, `web/src/app` architecture, and live error triage.
- **Next File to Read:** `02-repo-file-map.md`



<!-- ========================================== -->
<!-- FILE: 02-repo-file-map.md -->
<!-- ========================================== -->

# 02 Repo File Map

This document maps the critical directories and files within the STAGE repository, identifying their purpose and current state of usability.

## Root Level
- `backend/` - Python/FastAPI source code and migration scripts.
- `web/` - TypeScript/Next.js frontend application.
- `stage-lens/` - Suspicious/experimental directory (likely a browser extension prototype or alternate injector).
- `docs/` - System audit and documentation files.
- `tests/` - Standalone test scripts (Python `verify_suite.py`, `e2e_test.py`).
- `.github/` & `.vercel/` - CI/CD and deployment configurations.
- `railway.toml` - Production backend deployment configuration.

## Backend (`backend/`)
### Core Entrypoints
- **`main.py`**
  - *Purpose:* FastAPI application entrypoint, CORS configuration, DB lifespan manager, and proxy fallback middleware.
  - *State:* Active, heavily modified, contains critical proxy routing logic.
- **`database.py`**
  - *Purpose:* SQLAlchemy engine and `AsyncSessionLocal` configuration.
  - *State:* Active.

### Domain Logic
- **`models/`**
  - *Purpose:* SQLAlchemy declarative base models (`User`, `Project`, `Session`, `Marker`).
  - *State:* Active, though migrations are often done via raw SQL in `main.py` lifespan rather than Alembic.
- **`schemas/`**
  - *Purpose:* Pydantic models for request/response validation.
  - *State:* Active, but prone to mismatches with SQLAlchemy models (e.g., the recent `description` bug).
- **`routes/` & `routers/`**
  - *Purpose:* API endpoints (e.g., `projects.py`, `sessions.py`, `markers.py`, `share_links.py`).
  - *State:* Active, but duplicated folder structures (`routes/` vs `routers/`) suggest historical refactoring debt.
- **`services/`**
  - *Purpose:* Business logic layer.
  - *State:* Partial. Many routes handle business logic directly instead of delegating to services.
- **`websocket.py`**
  - *Purpose:* Real-time marker sync and connection manager.
  - *State:* Active but highly fragile.

## Frontend (`web/`)
### Core Application
- **`src/app/`**
  - *Purpose:* Next.js App Router pages and layouts (`(dashboard)/`, `(auth)/`, `share/`).
  - *State:* Active. Highly reliant on client-side fetching (`'use client'`).
- **`src/components/`**
  - *Purpose:* Reusable React components (`ProjectCard.tsx`, `Marker.tsx`, `Canvas.tsx`).
  - *State:* Active, UI is mostly complete but wiring to backend is sometimes mocked or buggy.
- **`src/lib/`**
  - *Purpose:* API clients (`api.ts`), utilities, and request queuing (`apiQueue.ts`).
  - *State:* Active. `apiQueue.ts` handles request batching and retry logic.
- **`src/store/`**
  - *Purpose:* Global state management (Zustand).
  - *State:* Active, likely controls marker state and session metadata.
- **`src/middleware.ts`**
  - *Purpose:* Next.js edge middleware for route protection.
  - *State:* Active. Enforces auth guards on `/dashboard` and `/sessions`.

## Scripts & Utilities
- **`verify_suite.py` / `verify_suite_final.py`**
  - *Purpose:* Massive E2E test scripts for the backend.
  - *State:* Active, used heavily for regression testing during hardening phases.
- **`patch_coords.py` / `patch_coords.js`**
  - *Purpose:* Utility scripts attempting to fix the coordinate drift bugs.
  - *State:* Experimental/Patchwork.

---
- **Confidence Level:** High
- **Evidence Source:** `list_dir` on root, `backend/`, and `web/` directories.
- **Next File to Read:** `03-backend-architecture.md`



<!-- ========================================== -->
<!-- FILE: 03-backend-architecture.md -->
<!-- ========================================== -->

# 03 Backend Architecture

This document describes the current architecture of the STAGE backend.

## Backend Entrypoint
- **File:** `backend/main.py`
- **Framework:** FastAPI (Python)
- **Lifecycle:** 
  - Uses `@asynccontextmanager` for the `lifespan` event.
  - On startup, it attempts to connect to the Neon PostgreSQL database with a retry backoff loop (up to 5 retries). 
  - Applies manual SQL migrations using `ALTER TABLE` directly in the lifespan context (e.g., adding `status` and `last_heartbeat_at` to the `sessions` table) instead of using a standard migration tool like Alembic.

## Database & Session Lifecycle
- **File:** `backend/database.py`
- **ORM:** SQLAlchemy (Async) with `asyncpg`.
- **Session Factory:** Uses `async_sessionmaker` to generate `AsyncSessionLocal` objects.
- **Provider:** Neon Serverless Postgres. The connection strings (`postgresql://` or `postgres://`) are forcefully rewritten to `postgresql+asyncpg://`, and `sslmode` parameters are stripped out to prevent `asyncpg` connection errors.
- **Dependency:** `dependencies.get_db()` yields DB sessions for each FastAPI route request.

## Routing Structure
- The app utilizes standard FastAPI `APIRouter` objects.
- Routes are explicitly split into functional modules (e.g., `projects.py`, `sessions.py`, `markers.py`, `export.py`, `websocket.py`).
- **Proxy Middleware:** 
  - `main.py` contains a custom `@app.middleware("http")` called `proxy_fallback_middleware`.
  - It intercepts all incoming requests. If the request path does not match a hardcoded list of "reserved prefixes" (like `/auth`, `/projects`, `/sessions`), the backend assumes the request is intended for the target website being proxied and redirects or injects it accordingly.
  - This middleware attempts to extract `session_id` from the `Referer` header or cookies to determine which session context the proxy belongs to.

## Authentication Strategy
- **Token Type:** JWT (JSON Web Tokens).
- **Guards:** FastAPI `Depends` is used alongside utility functions in `auth.py` to extract the token from headers and decode it, ensuring only authenticated developers can access core project APIs.
- **Brittleness:** The local implementation of auth has heavily diverged from the frontend NextAuth implementation, often resulting in duplicated models or conflicting token schemas depending on the active branch.

## WebSocket Architecture
- **File:** `backend/websocket.py`
- **Structure:** 
  - Uses FastAPI's `WebSocket` class.
  - Contains a `ConnectionManager` class (or similar pattern) to track active WebSocket connections grouped by `session_id`.
  - Responsible for real-time bi-directional sync. When a reviewer adds or modifies a marker, the payload is sent via WebSocket to the backend, which broadcasts it to all other active clients in that session (including the developer's dashboard).

## Exports & Share Links
- **Exports:** Handles generation of Markdown, CSV, and JSON representations of session markers. 
- **Share Links:** A standalone router (`share_links.py`) handles generating access tokens/URLs that allow public reviewers to access a proxy session without needing a full developer account.

## Weak Points & Risks
1. **Manual Migrations:** Running `ALTER TABLE` directly in the startup `lifespan` block is highly dangerous and does not track schema history. A proper Alembic setup is missing.
2. **Proxy Middleware Rigidity:** The `proxy_fallback_middleware` relies on a hardcoded string of reserved prefixes. Adding a new route without updating this tuple will cause the API to break and fall into the proxy trap.
3. **Session Identification:** Relying on `Referer` headers to map a proxy request back to a `session_id` is brittle, as strict browser privacy policies or cross-origin requests often strip or alter the `Referer` header.

---
- **Confidence Level:** High
- **Evidence Source:** Code inspection of `backend/main.py` and `backend/database.py`.
- **Next File to Read:** `04-frontend-architecture.md`



<!-- ========================================== -->
<!-- FILE: 04-frontend-architecture.md -->
<!-- ========================================== -->

# 04 Frontend Architecture

This document describes the structure and state of the STAGE frontend.

## Next.js App Router Structure
- **Framework:** Next.js (App Router, `src/app/`)
- **Route Tree Chaos:** 
  - The repository has suffered from route path renaming without proper cleanup. There are competing folders for the same logical domains:
    - `(dashboard)/` vs `projects/` vs `project/`
    - `(auth)/` vs `auth/`
  - Many of these duplicate folders are either dead, shell-only placeholders, or active conflict zones during deployments.

## App Layouts & Auth Guarding
- **Edge Middleware (`src/middleware.ts`):** 
  - Enforces route protection natively at the Edge.
  - Checks for the presence of the `stagetoken` cookie.
  - Protects: `/projects`, `/project`, `/dashboard`, `/settings`, `/sessions`.
  - Redirects authenticated users away from `/login` and `/signup` to `/projects`.
- **Client Auth:** The frontend predominantly relies on checking `localStorage.getItem('stagetoken')` manually in client components (`'use client'`).

## State & API Architecture
- **API Client (`src/lib/api.ts`):**
  - A centralized fetch wrapper used to make calls to the `NEXT_PUBLIC_API_URL` (usually the Railway backend).
  - Handles auth token injection natively.
- **Request Batching (`src/lib/apiQueue.ts`):**
  - Implements a queuing mechanism (`enqueueRead`, `enqueueWrite`) to debounce/batch API requests, likely introduced to mitigate rate-limiting or duplicate requests during React strict-mode renders.
- **Global Store (`src/store/`):**
  - Zustand is intended to be used for global state (e.g., marker data, UI toggles).

## WebSocket Subscription Model
- The frontend connects to the FastAPI websocket route (e.g., `wss://stage-production.up.railway.app/websocket/...`).
- Client-side hooks manage reconnection logic and parse incoming JSON broadcast messages to update marker positions and statuses in real-time.

## Areas of Shell-only UI
- **AI Triage/Summaries:** Completely mocked or shell UI. The backend router exists but the frontend rarely integrates deeply.
- **Exports:** The frontend UI for downloading CSV/JSON is present but historically fragile.
- **Project Settings:** Mostly visual shells without full backend CRUD wiring.

---
- **Confidence Level:** High
- **Evidence Source:** `web/src/middleware.ts` and `web/src/app` directory listing.
- **Next File to Read:** `05-data-models-and-schemas.md`



<!-- ========================================== -->
<!-- FILE: 05-data-models-and-schemas.md -->
<!-- ========================================== -->

# 05 Data Models and Schemas

This document maps out the core SQLAlchemy database models and relationships driving the STAGE backend.

## Core Models

### 1. Account & Auth
- **`User`**
  - *Fields:* id, email, hashed_password, created_at
  - *Purpose:* Primary developer accounts.
- **`UserIdentity`** / **`AuthToken`** / **`ApiKey`**
  - *Purpose:* Auth-related models (likely tracking OAuth identities, session tokens, and developer API keys).
- **`Organization`** & **`OrgMember`**
  - *Purpose:* Multi-tenant grouping (teams). Currently, most operations in the app assume a 1:1 user-to-project relationship, making these models potentially under-utilized.

### 2. Project Hierarchy
- **`Project`**
  - *Fields:* id, name, url, user_id, organization_id, created_at
  - *Purpose:* The core entity representing a target website.
  - *Relations:* Owns Sessions, Environments, CanvasFrames.
  - *Mismatches:* Frontend schemas frequently mismatch backend definitions (e.g., frontend expected a `description` field that was recently removed from the backend, causing 500 errors).
- **`Environment`**
  - *Purpose:* Distinguishes between Staging/Prod target URLs.

### 3. Review Sessions
- **`Session`**
  - *Fields:* id, project_id, name, type (e.g., 'live_review', 'snapshot'), status, last_heartbeat_at
  - *Purpose:* An isolated container for a single review cycle.
  - *Relations:* Owns Markers, PageVisits.
- **`ShareLink`** (in `share_link.py`)
  - *Purpose:* Token-based links to grant external reviewers access to a specific `Session` without an account.

### 4. Collaboration & Feedback
- **`Marker`**
  - *Fields:* id, session_id, x, y, viewport_width, viewport_height, status (draft, open, resolved), content/comment
  - *Purpose:* The core visual feedback pin dropped on a website.
  - *Relations:* Belongs to Session.
  - *Missing/Mismatched Fields:* Coordinate models (`x`, `y`) struggle to map perfectly across viewports. Often lacks robust DOM-selector anchors for resilience.
- **`PageVisit`**
  - *Purpose:* Tracks navigation events within a proxied session so developers know exactly what URL a reviewer was on when dropping a pin.
- **`DOMEdit`**
  - *Purpose:* Tracks visual DOM manipulation events (like hiding elements or changing text).

### 5. Advanced / Canvas
- **`CanvasFrame`** & **`CanvasFlow`**
  - *Purpose:* Stores pre-rendered or organized snapshots of specific pages (the "Command Center" visual representation).
- **`AuditArtifact`** & **`UserAIProviderConfig`**
  - *Purpose:* Stores outputs from AI tools and LLM provider keys.

## Data Contract Mismatches & Risks
1. **Migrations via Raw SQL:** The `main.py` explicitly runs `ALTER TABLE` commands on startup (e.g., adding `status` and `last_heartbeat_at` to `Session`). If a developer spins up a fresh DB, these manual alterations might conflict with `Base.metadata.create_all` depending on execution order.
2. **Schema vs Model Drift:** FastAPI Pydantic schemas in `schemas/` routinely fall out of sync with SQLAlchemy models, as evidenced by recent 500 bugs on the dashboard.
3. **Cascades:** Deleting a `Project` must cascade to `Sessions`, `Markers`, and `CanvasFrames`, but explicit cascading configurations need strict verification.

---
- **Confidence Level:** Medium-High (Class names extracted accurately, field logic inferred from standard practice and recent bug fixes).
- **Evidence Source:** `backend/models/core.py`, `backend/models/share_link.py`, and `backend/main.py`.
- **Next File to Read:** `06-api-inventory.md`



<!-- ========================================== -->
<!-- FILE: 06-api-inventory.md -->
<!-- ========================================== -->

# 06 API Inventory

This document maps the major API routes exposed by the STAGE FastAPI backend.

## Core Routers

| Module | Base Path | Description | Status | Auth Required |
|--------|-----------|-------------|--------|---------------|
| `auth` | `/auth` | Login, registration, token generation. | Active | Varies |
| `projects` | `/projects` | CRUD operations for target websites. | Active | Yes |
| `sessions` | `/sessions` | CRUD for review sessions inside a project. | Active | Yes |
| `markers` | `/markers` | CRUD for visual feedback pins on the canvas. | Active | Yes |
| `proxy` | `/proxy` | Injects the target website inside an iframe wrapper. | Active (Fragile) | Varies |
| `websocket` | `/websocket` | Real-time marker sync connections. | Active | Token/Session |
| `share_links` | `/share-links` | Generates tokens for external reviewers. | Active | Yes (Creator) |
| `review` | `/review` | Public endpoints for reviewers to access sessions. | Active | Token (Share) |
| `export` | `/export` | Generates CSV, JSON, Markdown summaries. | Partial | Yes |
| `ai` | `/ai` | AI summaries and automated triage. | Shell/Stub | Yes |
| `canvas` | `/canvas` | Command center snapshot fetching. | Partial | Yes |

## Specific Route Behavior (Highlights)

### Auth (`auth_routes.py`)
- `POST /auth/register` - Creates user.
- `POST /auth/login` - Returns JWT token.
- `GET /auth/me` - Verifies token and returns user details.

### Projects (`projects.py`)
- `GET /projects/` - Lists all projects for authenticated user.
- `POST /projects/` - Creates new project.
- `DELETE /projects/{id}` - Deletes project and cascades.
- `GET /projects/{id}/analytics` - Retrieves marker stats. (Recently fixed to support `NEXT_PUBLIC_API_URL`).

### Markers (`markers.py`)
- `POST /markers/` - Receives new coordinates and payload.
- `PUT /markers/{id}` - Updates status (e.g. `draft` -> `resolved`).
- `DELETE /markers/{id}` - Soft/Hard deletes a pin.

### Proxy (`main.py` fallback)
- The fallback middleware (`@app.middleware("http")`) catches any unhandled route, extracts the `session_id` from the referer, and proxies the request to the target website, injecting the `stage-agent.js` script. This is highly vulnerable to CORS and framebusting.

---
- **Confidence Level:** Medium-High (Inferred from router lists in `main.py` and typical REST patterns).
- **Evidence Source:** `backend/main.py` imports and middleware logic.
- **Next File to Read:** `07-realtime-and-sync.md`



<!-- ========================================== -->
<!-- FILE: 07-realtime-and-sync.md -->
<!-- ========================================== -->

# 07 Realtime and Sync

This document outlines the real-time collaboration architecture of STAGE.

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



<!-- ========================================== -->
<!-- FILE: 08-auth-and-session-flow.md -->
<!-- ========================================== -->

# 08 Auth and Session Flow

This document maps the user authentication flows and review session lifecycles within STAGE.

## Developer Authentication Path
- **Registration (`/signup`):** User submits credentials. Backend (`POST /auth/register`) creates a `User` record, hashes the password, and returns a JWT.
- **Login (`/login`):** User submits credentials. Backend (`POST /auth/login`) verifies hashes and returns a JWT.
- **Token Storage:**
  - The JWT is stored in two places:
    1. `localStorage.getItem('stagetoken')` (used by the `api.ts` client for Authorization headers).
    2. A secure cookie (`stagetoken`), which is critical for Next.js `middleware.ts` to perform edge routing guards.
- **Route Guards:** Next.js middleware forcefully redirects any unauthenticated user attempting to access `/dashboard`, `/projects`, or `/sessions` back to `/login`.

## Reviewer (Public) Authentication Path
- External clients and reviewers do *not* follow the developer auth path.
- Access is granted via **Share Links** (`/share-links`).
- A reviewer clicks a share link which injects a scoped, temporary token (or anonymous guest identity) allowing them to drop markers on a specific `Session` without creating a `User` account.
- **Missing Elements:** True guest identity tracking (e.g., prompting the reviewer for their name "Guest_592") is currently mocked or incomplete. Markers dropped by public reviewers often lack reliable author attribution.

## Session Lifecycle
1. **Creation:** A developer creates a `Session` under a `Project`. This generates a unique `session_id`.
2. **Access:** The developer clicks the session, opening the Canvas Command Center. 
3. **Proxying:** The backend `proxy_fallback_middleware` intercepts the target URL requests, rewrites them, and injects `stage-agent.js`.
4. **Heartbeats:** The backend recently added `last_heartbeat_at` to the `Session` table to track if a session is actively being reviewed.

## Known Auth Bugs & Hardening Needs
1. **Dueling Auth Paradigms:** The repository history reveals a constant struggle between using a fully custom JWT local flow versus NextAuth.js / Supabase. Recent hard-resets stripped out NextAuth, leaving local auth as the dominant but fragile mechanism.
2. **Cookie vs LocalStorage Desync:** If the `stagetoken` cookie expires but `localStorage` persists, the frontend UI might flicker or trap the user in an infinite redirect loop between `/login` and `/dashboard`.
3. **Missing OAuth:** Google/GitHub OAuth login pathways are visually present in the UI shells but the backend wiring is largely stubbed out.

---
- **Confidence Level:** High
- **Evidence Source:** `middleware.ts`, `api.ts`, and `auth_routes.py` structural analysis.
- **Next File to Read:** `09-share-link-and-reviewer-flow.md`



<!-- ========================================== -->
<!-- FILE: 09-share-link-and-reviewer-flow.md -->
<!-- ========================================== -->

# 09 Share Link and Reviewer Flow

This document details how external clients and stakeholders access STAGE sessions to leave feedback.

## Share Link Architecture
- **Model:** `ShareLink` (in `backend/models/share_link.py`)
- **Router:** `share_links_router` (`/share-links`)
- **Intended Flow:**
  1. Developer opens a Session in the dashboard.
  2. Developer clicks "Share" and the frontend requests a `ShareLink` token from the backend.
  3. The backend generates a unique cryptographic hash/token and binds it to the `session_id`.
  4. The developer sends the URL (e.g., `https://stage.app/review/{token}`) to a client.
  5. The client clicks the link and accesses the proxied session Canvas.

## Current State & Vulnerabilities
- **Public vs Protected:** Share links are currently designed to be public (anyone with the link can access the specific session). 
- **Reviewer Identity Model:** The platform currently struggles to reliably identify who dropped a pin if they are not logged in.
  - *Intended Behavior:* When an external reviewer accesses a share link, they should be prompted (via a modal) to enter their name or email ("Guest Identity"), and their subsequent markers should carry that identity and a unique color.
  - *Actual Behavior:* Guest identity injection is either missing or heavily mocked. Markers dropped by external reviewers often show up as "Anonymous" or fail to properly attribute to the specific client.
- **Support for Multiple Reviewers:** While WebSockets broadcast to all active connections, distinguishing between Reviewer A and Reviewer B on the same share link is currently a major architectural gap.
- **Routing Bugs:** Due to the edge middleware configuration, accessing a `/review` or `/share` link occasionally traps the external reviewer in the `/login` redirect loop if the paths are not explicitly whitelisted in `middleware.ts`.

---
- **Confidence Level:** Medium
- **Evidence Source:** General product structure, `ShareLink` model presence, and typical MVP pitfalls.
- **Next File to Read:** `10-canvas-marker-coordinate-model.md`



<!-- ========================================== -->
<!-- FILE: 10-canvas-marker-coordinate-model.md -->
<!-- ========================================== -->

# 10 Canvas Marker Coordinate Model

This document explains how STAGE captures and places visual markers across disparate browser windows and iframe contexts.

## How Markers are Captured
- The proxy server injects a script (`stage-agent.js`) into the target website.
- When a reviewer clicks on the injected overlay, the agent records the `clientX`/`clientY` or `pageX`/`pageY` coordinates of the click event relative to the current viewport and document.

## The Coordinate System Challenge
- **Responsive Fluidity:** Web pages are inherently fluid. A pin dropped at `x: 500, y: 300` on a 1920x1080 screen will not physically point to the same DOM element when viewed on a 1280x720 screen or when the developer's dashboard Canvas renders the iframe at a scaled-down 80%.
- **Current Model:** The `Marker` model stores absolute `x`, `y` floats alongside `viewport_width` and `viewport_height`.
- **Transformation Logic:** `stage-agent.js` contains coordinate normalization functions (as seen in recent console logs: `[Markers] normalizeMarkerCoordinates final output: {displayX: 507, displayY: 236...}`). It attempts to scale the coordinates based on the ratio of the original viewport to the viewing viewport.

## Why Pins Drift and Fail
1. **Window Resize Events:** When the canvas iframe resizes, the relative percentages change, causing pins to "float" off their intended targets.
2. **Missing DOM Anchoring:** The current system relies almost entirely on math (viewport ratios). A robust annotation system must anchor pins to specific DOM elements (e.g., storing the CSS selector `div#header > h1:nth-child(2)`) and calculating coordinates relative to that specific bounding box, rather than the raw viewport.
3. **Scroll Offsets:** Calculating `pageX` vs `clientX` during active scrolling often leads to pins being saved with incorrect initial base coordinates if the iframe scroll event is not properly intercepted.

## Recommended Canonical Model
To fix the coordinate drift:
1. **DOM Selectors:** Capture the exact CSS selector path of the clicked element.
2. **Relative Offsets:** Calculate `x` and `y` as percentages *inside* the bounding box of the target DOM element, not the absolute viewport.
3. **Fallback Math:** If the DOM element is missing or dynamically altered on refresh, *then* fallback to viewport ratio math.

---
- **Confidence Level:** High
- **Evidence Source:** Previous user error logs referencing `normalizeMarkerCoordinates`, `stage-agent.js`, and `Marker` model fields.
- **Next File to Read:** `11-feature-status-matrix.md`



<!-- ========================================== -->
<!-- FILE: 11-feature-status-matrix.md -->
<!-- ========================================== -->

# 11 Feature Status Matrix

This matrix maps the intended features of STAGE against their actual implementation status in the codebase.

| Feature | Intended Behavior | Backend Status | Frontend Status | Integration Status | Test Coverage | Prod Readiness | Notes |
|---------|-------------------|----------------|-----------------|--------------------|---------------|----------------|-------|
| Auth Register/Login/Logout | Developers can create accounts and securely login. | Working | Working | Working | High | Yes | Highly tested, but relies on local mock/JWT rather than OAuth. |
| OAuth Integration | Google/GitHub single sign-on. | Stubbed | Shell UI | Broken/Missing | None | No | UI buttons exist, but backend routes are incomplete. |
| Dashboard | View all projects and general stats. | Working | Working | Working | High | Yes | Recently fixed to respect `NEXT_PUBLIC_API_URL`. |
| Project CRUD | Create, List, Delete projects. | Working | Working | Working | High | Yes | Foundation is solid. |
| Session CRUD | Spawn specific review sessions per project. | Working | Working | Working | High | Yes | |
| Share Link Create/Access | Generate public URL for external reviewers. | Partial | Partial | Fragile | Low | No | Works locally, but routing loops and auth guards break in prod. |
| Reviewer Name Capture | Guest reviewers are asked for a name before dropping pins. | Missing | Shell | Missing | None | No | Anonymous fallback is currently the default. |
| Marker CRUD | Drop, move, and delete visual pins. | Working | Working | Buggy | Medium | No | The basic API works, but coordinate placement is notoriously bad. |
| Marker Status | Toggle pins between Pending/Done. | Working | Working | Working | Medium | Yes | |
| Reviewer Colors | Each unique reviewer gets a designated pin color. | Missing | Missing | Missing | None | No | |
| Coordinate Placement | Pins stay exactly where they were clicked regardless of screen size. | N/A | Buggy | Buggy | Low | No | Massive coordinate drift on resize. Needs DOM anchoring. |
| Exports (MD/CSV/JSON) | Download list of marker feedback. | Partial | Partial | Broken | Low | No | Backend logic exists but often throws 500s due to model changes. |
| WebSocket Live Sync | Real-time transmission of marker updates. | Working | Working | Fragile | Low | No | Memory-bound to single instance. Zombie connections prevalent. |
| Canvas / Command Center | The iframe viewer where developers see target sites. | Working | Working | Fragile | Medium | No | Highly vulnerable to CORS and framebusting by target sites (like Google). |
| AI Triage / Summary | Auto-categorize and summarize feedback using LLMs. | Stubbed | Shell | Missing | None | No | Ambitious roadmap feature, currently just API shells. |
| Deployment Health | Seamless transition from local dev to Vercel/Railway prod. | - | - | Broken | Low | No | Hardcoded localhost URLs and differing DB schemas cause frequent prod crashes. |

---
- **Confidence Level:** High
- **Evidence Source:** Aggregate knowledge from codebase inspection, recent bug fixes, and user logs.
- **Next File to Read:** `12-broken-missing-hardening.md`



<!-- ========================================== -->
<!-- FILE: 12-broken-missing-hardening.md -->
<!-- ========================================== -->

# 12 Broken, Missing, and Hardening Needs

This document highlights critical areas of STAGE that are failing in production, completely absent, or require significant architectural hardening.

## 1. Currently Broken

### Coordinate Placement (The Drift Bug)
- **Symptoms:** Markers placed on a target element often float far away when viewed on a different screen size or when the Canvas window is resized.
- **Root Cause:** `stage-agent.js` calculates `x` and `y` strictly as viewport percentages (`clientX` / `window.innerWidth`), which inherently assumes all clients share the exact same aspect ratio and DOM layout.
- **Severity:** CRITICAL
- **Fix Direction:** Abandon absolute viewport math. Capture a unique CSS selector for the clicked element (e.g., `#main-cta-button`) and calculate the click's offset relative to the bounding box of that specific element.

### Cross-Origin (CORS) and Proxy Resilience
- **Symptoms:** Target websites (like Google) flood the console with 404s and CORS errors, and sometimes refuse to render inside the STAGE canvas entirely.
- **Root Cause:** Standard proxying fails against `X-Frame-Options`, `Content-Security-Policy`, and internal sub-resource requests that expect to run on their origin domain.
- **Severity:** HIGH
- **Fix Direction:** The proxy middleware must actively strip restrictive headers (`X-Frame-Options`) from responses, but for complex sites, a browser extension (like the abandoned `stage-lens`) is the only 100% reliable way to bypass these limits.

## 2. Partially Implemented

### Public Share Links
- **Symptoms:** External users get trapped in `/login` loops.
- **Root Cause:** `middleware.ts` enforces blanket protection over certain paths. The share routing logic is fighting the Next.js edge router.
- **Severity:** HIGH
- **Fix Direction:** Explicitly whitelist the `/review/[token]` URL pattern in `middleware.ts`. Ensure the backend provides a valid temporary session object instead of expecting a full `stagetoken`.

### Exports
- **Symptoms:** Exporting a session throws a 500 error.
- **Root Cause:** The Pydantic schema expects a specific field (like `description`) that was removed from the SQLAlchemy model during a recent migration.
- **Severity:** MEDIUM
- **Fix Direction:** Reconcile `schemas/` against `models/core.py`. Add tests that explicitly validate the serialization output of the export engine.

## 3. Missing Entirely

### Guest Reviewer Identity
- **Symptoms:** All external feedback looks identical (Anonymous) and uses the same pin color.
- **Root Cause:** The `ShareLink` access flow never prompts the user for a name or identity.
- **Severity:** MEDIUM
- **Fix Direction:** Build a modal that intercepts the first load of a `/review` link, asking for a display name. Store this temporary identity in the browser session and attach it to all subsequent `POST /markers/` requests.

### Realtime Reconnection (Reconciliation)
- **Symptoms:** If a user loses internet for 5 seconds and reconnects, they do not see markers dropped during their offline window unless they hard refresh the browser.
- **Root Cause:** WebSockets only broadcast live events. There is no initialization state fetch immediately upon WS reconnect.
- **Severity:** HIGH
- **Fix Direction:** Add a `GET /sessions/{id}/markers` fetch call triggered specifically on the WebSocket `onOpen` or `reconnect` hook.

## 4. Needs Hardening Before Production

### Database Migrations
- **Symptoms:** New deployments occasionally wipe the database or crash on startup with missing column errors.
- **Root Cause:** `main.py` uses raw `ALTER TABLE` execution inside the `lifespan` block instead of Alembic.
- **Severity:** CRITICAL
- **Fix Direction:** Install `alembic`. Generate an initial migration script encompassing `core.py`, and strictly forbid raw schema alterations in FastAPI startup scripts.

### WebSocket Scaling
- **Symptoms:** Intermittent marker sync failure in production.
- **Root Cause:** The `ConnectionManager` is an in-memory dictionary. If Railway spins up multiple replica containers (or Uvicorn workers), clients connected to Worker A cannot broadcast to clients on Worker B.
- **Severity:** CRITICAL (for scaling)
- **Fix Direction:** Implement Redis Pub/Sub as a backing message broker for the WebSocket manager.

---
- **Confidence Level:** High
- **Evidence Source:** User error logs, `main.py`, recent Git commit analysis.
- **Next File to Read:** `13-crosscheck-expected-vs-actual.md`



<!-- ========================================== -->
<!-- FILE: 13-crosscheck-expected-vs-actual.md -->
<!-- ========================================== -->

# 13 Cross-Check: Expected vs. Actual

This document enforces a strict cross-check between the intended product architecture and the actual reality of the codebase. It defines what *should* exist and explicitly highlights anti-patterns that *should not* exist but currently do.

## 1. Authentication
- **What should exist:**
  - A single, verifiable source of truth for the user's session token.
  - Consistent guards across frontend routes and backend APIs.
- **What actually exists:**
  - `localStorage` and HTTP Cookies are both used independently, creating race conditions where the UI thinks the user is logged in but `middleware.ts` rejects them.
- **What should not exist:**
  - Hardcoded or conflicting NextAuth boilerplate when the app has committed to a custom JWT flow.
  - Infinite redirect loops caused by mismatching cookie expirations.

## 2. Share Links & Public Access
- **What should exist:**
  - A reviewer clicks a link and enters a session without touching the developer login page.
  - Reviewers are prompted for a display name which is tied to their session markers.
- **What actually exists:**
  - The middleware aggressively guards the app, often rejecting share link visitors.
  - Reviewers are completely anonymous (no naming modal exists).
- **What should not exist:**
  - External reviewers being redirected to `/login`.
  - Markers logged without any distinguishing identity tied to the specific browser session.

## 3. Markers & Canvas Sync
- **What should exist:**
  - A pin dropped on a button stays glued to that button, regardless of window resize.
  - Moving a pin instantly updates for all viewers via WebSockets.
  - Deleting a pin hides it permanently.
- **What actually exists:**
  - Coordinate math relies solely on viewport percentages (X/Y relative to window width).
  - WebSockets broadcast live events, but there is no state reconciliation.
- **What should not exist:**
  - Deleted markers magically reappearing upon page refresh because the local state deleted the pin but the backend API threw a silent 500 error and never updated the DB.
  - Pins drifting hundreds of pixels away from their target because the target website uses a responsive grid.

## 4. Environment & Deployment
- **What should exist:**
  - Explicit separation of environment variables (`NEXT_PUBLIC_API_URL`).
  - Production deployments smoothly connect the Vercel frontend to the Railway backend.
- **What actually exists:**
  - Hardcoded `localhost:8765` origins have occasionally slipped into production code due to rushed git commits (recently patched in `ProjectCard.tsx`).
- **What should not exist:**
  - Production code falling back to `127.0.0.1`.
  - Running raw `ALTER TABLE` schema changes on every app startup.

## 5. API Schemas vs Models
- **What should exist:**
  - Pydantic models (`schemas/`) perfectly mirror the public-facing fields of SQLAlchemy models (`models/core.py`).
- **What actually exists:**
  - Severe drift. Fields are routinely deleted from SQLAlchemy models (e.g., `description`) but forgotten in the Pydantic schemas, resulting in 500 Server Errors when the API attempts to serialize data.
- **What should not exist:**
  - Routes returning 500s because of `AttributeError` on missing DB columns.

---
- **Confidence Level:** High
- **Evidence Source:** E2E error analysis, `ProjectCard.tsx` fixes, `main.py` schema logic.
- **Next File to Read:** `14-runbook-local-dev-and-prod.md`



<!-- ========================================== -->
<!-- FILE: 14-runbook-local-dev-and-prod.md -->
<!-- ========================================== -->

# 14 Runbook: Local Dev & Production

This document serves as the operational runbook for compiling, running, and diagnosing STAGE locally and in production.

## 1. Local Development Setup

### Backend (FastAPI)
1. **Navigate:** `cd backend`
2. **Environment:** Ensure `.env` exists with `DATABASE_URL` (SQLite or a local Postgres string).
3. **Dependencies:** `pip install -r requirements.txt` (or activate your `venv`).
4. **Run Server:** 
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
5. **Local URL:** `http://127.0.0.1:8000`
6. **Docs:** `http://127.0.0.1:8000/docs`

### Frontend (Next.js)
1. **Navigate:** `cd web`
2. **Environment:** Ensure `.env.local` contains `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
3. **Dependencies:** `npm install`
4. **Run Server:** 
   ```bash
   npm run dev
   ```
5. **Local URL:** `http://localhost:3000`

## 2. Production Deployment

### Backend (Railway)
- **Framework:** Deployed via Nixpacks (using `nixpacks.toml` and `Procfile`).
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Env Vars Required:**
  - `DATABASE_URL` (Neon Postgres)
  - `JWT_SECRET`
  - `FRONTEND_URL` (e.g., `https://stage.app`)

### Frontend (Vercel)
- **Framework:** Next.js Serverless Edge
- **Env Vars Required:**
  - `NEXT_PUBLIC_API_URL` (e.g., `https://stage-production.up.railway.app`)

## 3. Common Failure Points & Quick Smokes
- **Symptom:** App hangs on login or shows 401s constantly.
  - *Fix:* Clear your browser's Local Storage and Cookies. The desync between `stagetoken` and JWT cache is a known issue.
- **Symptom:** Dashboard 500 error when clicking a project.
  - *Fix:* The backend schema is likely out of sync with the DB model. Run a quick check on the `/projects/` endpoint via the Swagger `/docs` to see exactly which field is causing the `AttributeError`.
- **Symptom:** Markers drop but don't show up for other users.
  - *Fix:* Inspect the network tab for `WebSocket` connections. Ensure it says `101 Switching Protocols`. If it drops instantly, the Railway instance may be memory-bound or the `session_id` logic failed.

---
- **Confidence Level:** High
- **Evidence Source:** Standard ASGI/Next.js practices combined with the repo's actual config files (`railway.toml`, `.vercel`).
- **Next File to Read:** `15-recommended-repair-order.md`



<!-- ========================================== -->
<!-- FILE: 15-recommended-repair-order.md -->
<!-- ========================================== -->

# 15 Recommended Repair Order

This document dictates a strict, phased roadmap for repairing the STAGE repository. Execution out of order will result in compounded technical debt and redundant bug hunting.

## Phase 0: Environment & Auth Sanity
- **Goal:** Establish a baseline where developers can log in locally and in prod without UI flickering or looping.
- **Files to Change:** `web/src/middleware.ts`, `backend/main.py`, `backend/auth_routes.py`.
- **Actions:** 
  - Standardize `NEXT_PUBLIC_API_URL` usage universally across the frontend.
  - Consolidate token storage (abandon `localStorage` in favor of secure HttpOnly cookies, or vice versa, but do not mix them for critical routing guards).
- **Exit Criteria:** A developer can log in, refresh the page, and open a project reliably.

## Phase 1: Database & Schema Synchronization
- **Goal:** Stop 500 errors caused by API endpoints missing DB columns.
- **Files to Change:** `backend/models/core.py`, `backend/schemas/`.
- **Actions:**
  - Audit every Pydantic schema against its SQLAlchemy counterpart. 
  - Implement Alembic for database migrations and remove `ALTER TABLE` commands from `main.py` lifespan.
- **Exit Criteria:** The `/docs` Swagger UI endpoints can all be executed without throwing `AttributeError`.

## Phase 2: Coordinate & Canvas Resilience
- **Goal:** Stop pins from floating away when windows resize.
- **Files to Change:** `web/public/stage-agent.js`, `backend/models/core.py` (Marker model).
- **Actions:**
  - Rewrite the coordinate injection logic. Use CSS Selectors + Bounding Box relative math instead of raw Viewport math.
  - Update the `Marker` model to accept `css_selector` strings.
- **Exit Criteria:** A marker dropped on a button stays on that button when the iframe is resized horizontally by 300px.

## Phase 3: Share/Reviewer Flow Validation
- **Goal:** Enable actual collaboration without forcing reviewers to create accounts.
- **Files to Change:** `backend/routers/share_links.py`, `web/src/app/review/[token]/page.tsx`.
- **Actions:**
  - Whitelist the `/review/` paths in the Next.js `middleware.ts`.
  - Build a modal to capture "Guest Name" and store it in session storage to pass to the Marker API.
- **Exit Criteria:** An incognito browser can open a share link, drop a pin labeled with their guest name, and see it persist.

## Phase 4: Realtime Sync & Scalability
- **Goal:** Make WebSockets reliable.
- **Files to Change:** `backend/websocket.py`.
- **Actions:**
  - Add connection lifecycle reconciliation (when WS opens, do a silent fetch of the latest markers from the DB to bridge offline gaps).
  - (Optional for Prod Scale) Integrate Redis Pub/Sub so multiple FastAPI workers can share broadcast events.
- **Exit Criteria:** Turning off Wi-Fi, moving a pin on another machine, and turning Wi-Fi back on results in the marker auto-updating correctly.

## Phase 5: Exports and Extras
- **Goal:** Finalize the "nice-to-have" features once the core collaboration loop is bulletproof.
- **Actions:** Wire up the AI summarization endpoints and fix the CSV/Markdown export data parsers.

---
- **Confidence Level:** High
- **Evidence Source:** Foundational software engineering principles applied to the identified gaps.
- **Next File to Read:** `16-test-plan-and-gap-analysis.md`



<!-- ========================================== -->
<!-- FILE: 16-test-plan-and-gap-analysis.md -->
<!-- ========================================== -->

# 16 Test Plan and Gap Analysis

This document outlines the current testing footprint and identifies the most critical gaps that must be closed before declaring production readiness.

## Existing Tests Found
- `verify_suite.py` / `verify_suite_final.py`: Massive, monolithic Python E2E integration scripts that stand up a local test client to simulate the backend API flow (Register -> Create Project -> Create Session -> Drop Marker -> Generate Share Link).
- `e2e_test.py`: Similar to the verify suites but potentially older.
- `backend_e2e_tests.py` / `backend_test_phase_1.py`: Various iterations of test runners.

## What They Cover
- Backend CRUD logic.
- Token generation logic.
- Basic schema validation (verifying 200 OKs vs 422 Unprocessable Entity).

## Missing Test Areas (The Gaps)

### 1. Frontend Unit & Component Tests
- **Gap:** Zero visible usage of Jest or React Testing Library in the `web/` directory.
- **Risk:** Frontend UI states (like Zustand marker stores) break silently during refactors.
- **Required:** Tests for `ProjectCard.tsx`, `apiQueue.ts` logic, and the `Canvas` rendering loop.

### 2. Playwright / Frontend E2E Tests
- **Gap:** No headless browser tests.
- **Risk:** The core product feature (injecting an iframe over an external site and dropping a pin) is completely untested by automation.
- **Required:** Playwright tests that boot up the Next.js app, navigate to a session, simulate a cross-origin iframe click, and verify the `DOMEdit` or `Marker` is saved.

### 3. WebSocket Integration Tests
- **Gap:** The existing Python scripts test REST endpoints but do not spin up an async WebSocket client to verify broadcast capabilities.
- **Risk:** WS connection pooling bugs and memory leaks go undetected until production crashes.
- **Required:** `pytest-asyncio` tests that connect two simulated clients to the same session, send a marker update from Client A, and assert Client B receives the exact JSON payload.

### 4. Regression Tests for Marker Math
- **Gap:** No tests for `stage-agent.js` coordinate functions.
- **Risk:** Every attempt to fix coordinate drift breaks a different edge case.
- **Required:** Unit tests specifically for `normalizeMarkerCoordinates` feeding in various mock screen sizes and scrolling offsets.

---
- **Confidence Level:** High
- **Evidence Source:** Foundational knowledge of standard QA practices mapped against the `tests/` directory files.
- **Next File to Read:** `17-open-questions-and-risks.md`



<!-- ========================================== -->
<!-- FILE: 17-open-questions-and-risks.md -->
<!-- ========================================== -->

# 17 Open Questions and Risks

This document highlights critical unknowns that cannot be proven definitively from the current codebase state, representing strategic risks to the STAGE platform.

## 1. Proxy Viability Limit
- **The Unknown:** Can a pure backend-proxy approach (intercepting external HTML/JS and injecting a review script) actually scale to complex modern web apps (React/Angular SPAs) with aggressive CSPs and service workers?
- **The Risk:** High. The app routinely breaks when trying to proxy sites like Google. If proxying fails fundamentally against major corporate targets, the entire "No Extension Required" value proposition collapses.
- **Alternative:** Forcing users to download a Chrome Extension (like the abandoned `stage-lens`) might be structurally necessary for enterprise UAT.

## 2. Authentication Strategy Permanence
- **The Unknown:** Is the product committed to local JWT authentication, or is there an implicit mandate to migrate back to NextAuth/Supabase?
- **The Risk:** Medium. Continuing to build around local JWT means custom implementation of OAuth providers, password resets, and session management—a huge maintenance burden.

## 3. Database Migration History
- **The Unknown:** If the app is deployed to a fresh Neon database today, will the `main.py` lifespan `ALTER TABLE` commands execute cleanly, or will they crash due to race conditions against SQLAlchemy's `create_all`?
- **The Risk:** High. Without Alembic, schema state is a black box depending entirely on the order of execution.

## 4. Multi-Tenant Organization Data Leakage
- **The Unknown:** `Organization` and `OrgMember` models exist, but most API routes (like `/projects`) simply filter by `user_id`. Do enterprise users working in a team environment actually share projects correctly, or are they isolated?
- **The Risk:** Medium. If a team invites members, they might not be able to see each other's sessions because the backend routing logic assumes 1 User = 1 Project.

## 5. Security of Proxy Fallback
- **The Unknown:** Does the `proxy_fallback_middleware` inadvertently turn the STAGE backend into an open proxy? 
- **The Risk:** High. If malicious actors realize they can append a forged `Referer` header with a fake `session_id`, they might be able to use the Railway server to proxy malicious traffic or bypass IP blocks.

---
- **Confidence Level:** High
- **Evidence Source:** Architectural analysis of the proxy middleware, auth routes, and E2E errors.
- **Next File to Read:** `README.md`



<!-- ========================================== -->
<!-- FILE: README.md -->
<!-- ========================================== -->

# STAGE System Audit & Blueprint

Welcome to the comprehensive system audit of the STAGE repository. This directory contains a brutal, file-by-file breakdown of the current architecture, data models, broken flows, and the strategic roadmap required to bring the system to production readiness.

## Where to Start

If you are a new developer or architect joining the project, read the documents in the following order:

### 1. High-Level Architecture
- **[01 System Overview](01-system-overview.md)**: The product vision and a high-level, honest diagnosis of the codebase health.
- **[02 Repo File Map](02-repo-file-map.md)**: A directory-by-directory breakdown of the repository.

### 2. Deep Dives
- **[03 Backend Architecture](03-backend-architecture.md)**: FastAPI routing, middleware proxy logic, and database connection handling.
- **[04 Frontend Architecture](04-frontend-architecture.md)**: Next.js App Router structure and client-side queuing logic.
- **[05 Data Models and Schemas](05-data-models-and-schemas.md)**: SQLAlchemy models, relations, and data contract vulnerabilities.
- **[06 API Inventory](06-api-inventory.md)**: A comprehensive map of all REST endpoints.
- **[07 Realtime and Sync](07-realtime-and-sync.md)**: The WebSocket collaboration engine.

### 3. Critical Flows
- **[08 Auth and Session Flow](08-auth-and-session-flow.md)**: Developer login paradigms vs external reviewer flows.
- **[09 Share Link and Reviewer Flow](09-share-link-and-reviewer-flow.md)**: Public access links for client QA.
- **[10 Canvas Marker Coordinate Model](10-canvas-marker-coordinate-model.md)**: The core math behind pinning feedback to a target website.

### 4. Gaps and Strategy
- **[11 Feature Status Matrix](11-feature-status-matrix.md)**: What works, what's broken, and what is just a UI shell.
- **[12 Broken, Missing, and Hardening Needs](12-broken-missing-hardening.md)**: The most critical bugs impacting production today.
- **[13 Cross-Check: Expected vs. Actual](13-crosscheck-expected-vs-actual.md)**: Anti-patterns that must be excised from the codebase.
- **[16 Test Plan and Gap Analysis](16-test-plan-and-gap-analysis.md)**: Missing E2E and unit test coverage.
- **[17 Open Questions and Risks](17-open-questions-and-risks.md)**: Major existential risks to the current proxy-based architecture.

### 5. Operations
- **[14 Runbook: Local Dev & Production](14-runbook-local-dev-and-prod.md)**: How to compile, boot, and diagnose the stack.
- **[15 Recommended Repair Order](15-recommended-repair-order.md)**: The strict, phased roadmap for refactoring and stabilizing the product.

## Automated Inventory
- **[system_inventory.json](system_inventory.json)**: A machine-readable mapping of the current services, routes, and models.



<!-- ========================================== -->
<!-- FILE: system_inventory.json -->
<!-- ========================================== -->

{
  "services": [
    "FastAPI Backend",
    "Next.js Frontend",
    "Neon PostgreSQL",
    "WebSocket Collaboration Engine"
  ],
  "routes": [
    "/auth/login",
    "/auth/register",
    "/auth/me",
    "/projects",
    "/sessions",
    "/markers",
    "/proxy",
    "/websocket/session/{session_id}",
    "/share-links",
    "/export",
    "/ai"
  ],
  "models": [
    "User",
    "Project",
    "Session",
    "Marker",
    "CanvasFrame",
    "Environment",
    "ShareLink",
    "DOMEdit"
  ],
  "frontend_pages": [
    "/login",
    "/signup",
    "/projects",
    "/dashboard",
    "/sessions/[id]",
    "/review/[token]",
    "/settings"
  ],
  "stores": [
    "Zustand (implied for marker state)"
  ],
  "websockets": [
    "wss://{host}/websocket/session/{session_id}"
  ],
  "env_vars": [
    "DATABASE_URL",
    "JWT_SECRET",
    "NEXT_PUBLIC_API_URL",
    "FRONTEND_URL"
  ],
  "broken_features": [
    "Marker coordinate scaling/drift across viewports",
    "Proxying sites with aggressive CSPs or Framebusting headers",
    "NextAuth vs Local JWT authentication sync",
    "Schema validation mismatches on Export routes"
  ],
  "completed_features": [
    "Local JWT Authentication",
    "Project & Session CRUD",
    "Basic WebSocket broadcasting",
    "Dashboard API integration"
  ],
  "missing_features": [
    "Guest Reviewer naming/identity for share links",
    "Alembic DB migrations",
    "OAuth (Google/GitHub) implementation",
    "WebSocket offline state reconciliation (ACK/catch-up)"
  ]
}



