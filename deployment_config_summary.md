# PixelMark Production Deployment Configuration & Observability Audit

This document serves as the central deployment configuration reference, hardening handbook, and observability manual for PixelMark. It details the verified production environment variables, deployment gating checklist, log patterns, trace ID propagation mechanics, and live systems audit results.

---

## 1. Verified Production Environment Variables

To harden the live environments against data leaks and security exposures, the platform team has audited and verified the following production environment settings:

### 🌐 Backend Configuration (`backend/.env`)
- `ENVIRONMENT`: Must be set to `production` (disables auto-reloads and limits error stack traces in JSON payloads).
- `DATABASE_URL`: Safe SQLAlchemy async connection string to the production Neon PostgreSQL cluster. SSL connection is forced via URL arguments automatically.
- `JWT_SECRET_KEY`: High-entropy 256-bit secure key. Auto-generated during deploy (never hardcoded, no development fallbacks allowed).
- `FRONTEND_URL`: Points strictly to the active frontend host (e.g. `https://pixelmark.app`). Used as single source of truth for CORS checks and CORS headers.
- `CORS_ORIGINS`: JSON array restricting backend access strictly to the primary domain and certified browser extension IDs: `["https://pixelmark.app", "chrome-extension://..."]`.
- `API_BASE`: Used by proxy rewriter to inject absolute backend endpoints for assets resolution. Must be `https://api.pixelmark.app`.
- `PORT`: Live port allocated by deployment infrastructure (default `8765` is never exposed).

### 🖥️ Frontend Configuration (`web/.env.local`)
- `NEXT_PUBLIC_API_URL`: Root URL of the production backend REST/WebSocket API (e.g. `https://api.pixelmark.app`).
- `NEXT_PUBLIC_LENS_SCRIPT_URL`: Direct link to the compiled, immutable PixelMark overlay injection script. Points to real deployed CDN host.
- **Zero Localhost References**: Verified via global scanner that no references to `localhost`, `127.0.0.1`, or development test domains exist in public production static bundles.

---

## 2. Hardened Production Security Architecture

### 🛡️ CORS and Iframe Embedding Headers
- **SSRF Safe-Guard**: Dynamic Target-Origin resolution blocks target requests to private IP ranges (RFC 1918) and loopbacks.
- **Header Stripping**: The proxy response rewriter securely strips `X-Frame-Options` and `Content-Security-Policy` headers *only* for the proxied review page. This enables responsive nested iframe previews while keeping the parent PixelMark application shell isolated and protected.
- **Strict Headers Preservation**: Next.js static asset loaders, font bundles, and glTF models preserve compression headers (`gzip`, `brotli`) and cache directives, and inject strict `Access-Control-Allow-Origin: *` to prevent CORS load failures inside WebGL renderers.

### ⏱️ Timeout and Cache Tuning
- **Proxy HTTP Fetch Timeout**: Enforced at `15.0s` for initial load and `10.0s` for secondary asset requests via `httpx` to prevent backend resource exhaustion from slow target origins.
- **Asset Caching System**: Deployed CDN and static resource requests serve `Cache-Control: public, max-age=31536000, immutable` headers. Server-side caching verifies content hashes before routing fresh requests, maximizing loading speeds in low-overhead or heavy WebGL sessions.

---

## 3. Platform Observability & Trace ID Propagation

Every critical user interaction is mapped to a concise, searchable log statement carrying a unique Request Trace ID (`x-request-id` header or random trace token), which instantly traces failures to a single session or user.

```
Incoming Request (x-request-id) ──> Proxy Fetch (TRACE=ID) ──> Rewriter (TRACE=ID) ──> DB Commit (TRACE=ID)
```

### 🔍 Standard Observability Log Events

#### 1. Proxy Fetch Events
- **Log Pattern**: `[OBSERVABILITY] [PROXY_FETCH] [TRACE={trace_id}] Fetching target: {base_url} (session={session_id})`
- **Response Pattern**: `[OBSERVABILITY] [PROXY_RESPONSE] [TRACE={trace_id}] Received target response: status_code={status} for URL={url}`

#### 2. Asset Resolution Events
- **Cache Hit Pattern**: `[OBSERVABILITY] [PROXY_ASSET_CACHE_HIT] [TRACE={trace_id}] Requested path: {path}, Resolved URL: {url}, Status: CACHE_HIT`
- **Cache Miss/Fetch Pattern**: `[OBSERVABILITY] [PROXY_ASSET_FETCH] [TRACE={trace_id}] Fetching asset: {url}`
- **Blocked Analytics Tracker Pattern**: `[OBSERVABILITY] [PROXY_ASSET_BLOCKED] [TRACE={trace_id}] BLOCKED tracking/analytics request. Path: {path}, Resolved: {url}`

#### 3. Renderer Type Detection Events
- **Log Pattern**: `[OBSERVABILITY] [RENDERER_DETECTED] Deployed agent detected renderer type: {renderer} for session={session_id}. has_webgl={webgl}, has_three_js={threejs}`

#### 4. Marker Payload Validation Errors
- **Log Pattern**: `[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] {error_details}`

#### 5. Share Link Resolution Failures
- **Log Pattern**: `[OBSERVABILITY] [SHARE_ACCESS_FAILURE] [TRACE={trace_id}] Share link token={token} {reason_for_failure}`

#### 6. Page-Visit Recording Failures
- **Log Pattern**: `[OBSERVABILITY] [PAGE_VISIT_RECORD_FAILURE] Failed to record page visit. session={session_id}, url={url}, error={db_exception}`

---

## 4. Production Deployment & Rollback Checklists

### 🚀 Production Deployment Checklist
1. **Migration Verification**: Run `alembic upgrade head` or execute `hardening_migration.sql` to verify database schemas match live requirements.
2. **Health Check Checkpoint**: Confirm backend `/proxy/session/{session_id}` and `/markers/` health endpoints return active `200` or expected codes.
3. **Environment Audit**: Assert `ENVIRONMENT=production` is successfully propagated to the active hosting container.
4. **SSL verification**: Assert HTTPS is enforced across all endpoints.

### ↩️ Rollback Execution Checklist
If a critical production error is detected (Auth failing, DB locking up, proxy routing failing), the platform engineer must execute the following rollback script immediately:

1. **Rollback Backend Code**:
   - Revert production branch to the last verified release tag (`git checkout tags/v1.4.2`).
   - Trigger instant production rebuild via Railway/Render panel.
2. **Database Schema State Recovery**:
   - If the database structure needs restoration, execute standard schema rollback:
     ```sql
     -- If conservative_render_mode columns break compatibility
     ALTER TABLE sessions DROP COLUMN IF EXISTS conservative_render_mode;
     ALTER TABLE sessions DROP COLUMN IF EXISTS renderer_type;
     ```
3. **Cache Flushing**:
   - Flush the redis/memcached buffer or clean the `/cache` target-hash directories to clear out any corrupted assets cached during the failed deploy.
4. **Verify Rollback Recovery**:
   - Run the production smoke test checklist. Assert Tier 1 core blocker flows are green immediately.
