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
