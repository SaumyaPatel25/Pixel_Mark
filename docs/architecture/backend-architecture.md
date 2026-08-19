# Backend Architecture

This document covers the backend application structure, routing layers, data access, realtime WebSockets, and proxy middleware.

---

## 1. Application Layering Model
The FastAPI backend follows a clean layering model separating HTTP routes, business logic, data access, and schemas:

```
[HTTP Request]
      │
      ▼
[FastAPI Middleware & Routers]
      │
      ▼
[Service Layer (Business Logic)]
      │
      ▼
[Repository Layer (Data Access)]
      │
      ▼
[Neon / SQLite Database]
```

- **Routes Layer (`backend/routes/` and `backend/routers/`)**: Handles request mapping, parsing path/query parameters, and returns HTTP responses.
- **Service Layer (`backend/services/` and `backend/markers/service.py`)**: Implements coordinate validation invariants, password cryptos, and AI report formatters.
- **Repository Layer (`backend/markers/repository.py`)**: Abstracts database queries, soft-deletes, and SQLAlchemy transactions.
- **Data Layer (`backend/database.py` and `backend/models/`)**: Manages SQLite (local) and Neon PostgreSQL (production) connection pool lifespans.

---

## 2. Server Entry Point & Life Cycle
- **Entry Point**: `backend/main.py` binds endpoints and initializes Uvicorn.
- **Lifespan Hook (`lifespan`)**: Executed on boot:
  - Evaluates environment settings (ensures `GITHUB_CLIENT_ID` exists in production).
  - Performs connection retries against Neon Database (5 attempts with exponential backoff).
  - Runs database schema migrations (`Base.metadata.create_all`).
  - *Evidence: backend/main.py:25-64*

---

## 3. Proxy Engine & Falling Middleware
The proxy engine interceptor is implemented as a custom HTTP middleware (`proxy_fallback_middleware` in `main.py`).
- **Reserved Prefix Routing**: If a path starts with reserved routes (e.g. `/auth`, `/projects`, `/sessions`, `/markers`), it forwards directly to the routers.
- **Unreserved Path Fallback**:
  - Resolves `session_id` using the request `Referer` header matching `/proxy/session/([a-f0-9\-]{36})`. If missing, it extracts it from the `stagesessionid` cookie, and finally falls back to mapping the client's host IP in `ACTIVE_IP_SESSIONS`.
  - Queries the project's base URL domain.
  - Passes the target domain through the SSRF safeguard (`is_ssrf_safe`) and checks domain-scoping constraints (`is_domain_allowed`).
  - Fetches the site. If HTML is returned, it rewrites relative URLs, injects cookies, and rewrites Next.js RSC requests. Non-HTML assets are cached locally.
  - Strips security headers (`x-frame-options`, `content-security-policy`) to allow target pages to render within the iframe.
  - *Evidence: backend/main.py:96-359*

---

## 4. Realtime Synchronization Architecture
STAGE coordinates collaboration using a combination of WebSockets and **Redis Pub/Sub**:
- **Socket Routes**: `/ws/sessions/{session_id}` and `/ws/session/{session_id}` (legacy).
- **Manager**: `realtime_manager` (`backend/realtime/connection_manager.py`) tracks active connections locally.
- **Redis Broadcaster (`backend/realtime/redis_broadcaster.py`)**:
  - Subscribes to `session:{id}` on Redis when the first local client connects.
  - Unsubscribes from Redis when the last client leaves.
  - Publishes events to the Redis channel when a marker changes, which are received by all server nodes.
  - In local development, if Redis is down, it falls back to direct single-instance local broadcasts.
- **Telemetry**: Heartbeats are verified periodically. Stale sessions (heartbeat older than 60s) are closed automatically (`backend/routes/sessions.py`).

---

## 5. Security Gates & Authentication
- **Dependencies (`backend/dependencies.py`)**:
  - `get_current_user`: Handles JWT standard decoding or API Key hashes checks (`pm_...`).
  - `require_role(minimum_role)`: Compares membership scopes (Owner, Admin, Member, Guest) against organizations tables.
- **SSRF Safeguard (`backend/utils/ssrf_guard.py`)**: Resolves target hostnames using `socket.getaddrinfo` and blocks private/local IP subnets. Loopback is allowed in local dev.
- **Validation**: Enforced via **Pydantic** models (`backend/schemas/` and `backend/markers/schemas.py`).

---

## 6. Telemetry and Telemetry Metrics
- **InMemoryCache (`backend/services/cache.py`)**: Caches list requests and updates. Evaluates hits/misses statistics.
- **Metrics Endpoint (`/metrics`)**: Exposes cache hit rates, active proxy counts, and idle closures.
- **Rate Limits**: Configured in routers using `ratelimit.py`.
