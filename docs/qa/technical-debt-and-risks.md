# Technical Debt and Risks

This document catalogs code complexities, scaling bottlenecks, database limitations, and security risks identified in the STAGE codebase.

---

## 1. Codebase Technical Debt

### 1.1 Complex UI Module (`AuditSurface.tsx`)
- **Location**: `web/src/components/audit/AuditSurface.tsx`
- **Debt**: This file is **over 3,100 lines long** and handles multiple unrelated concerns:
  - React lifecycle states and UI layout overlays.
  - Regional screenshot drawing canvas.
  - DOM-relative and WebGL coordinate calculations.
  - Periodic heartbeat calls.
  - State persistence for form drafts.
  - Bulk CSS export formats.
- **Risk**: Hard to maintain, high risk of introducing bugs on modification, and slow test rendering.
- **Remediation**: Split the file into separate custom hooks (e.g. `useDraftRecovery`, `useScreenshotRecapture`) and component files (e.g. `FeedbackDrawer`, `ProxyIframeWrapper`).

### 1.2 Wildcard Cache Invalidation Patterns
- **Location**: `backend/services/cache.py`
- **Debt**: Caching uses wildcard regex patterns `cache.invalidate("user:id:*")`. Any changes to query paths require diligent cache invalidation to prevent stale data.
- **Risk**: Stale data displays if routers omit invalidations, and regex scanning degrades performance under large numbers of keys.
- **Remediation**: Transition to Redis-backed tagging or structured key hashes.

---

## 2. Horizontal Scaling Bottlenecks

### 2.1 Single-Instance Degradation
- **Location**: `backend/realtime/redis_broadcaster.py`
- **Risk**: If the Redis server (`REDIS_URL`) goes down, the broadcaster degrades to local-only WebSocket broadcasts. While this allows the single server to keep running, it prevents multiple server nodes in a cluster from synchronizing cursor positions or marker events.
- **Remediation**: Implement a reconnect loop with alerts, and reject startup in production if Redis is unreachable.

### 2.2 In-Memory Caching (`InMemoryCache`)
- **Location**: `backend/services/cache.py`
- **Risk**: In-memory caching stores API responses locally on each instance. When a cluster runs multiple backend nodes, updates on Node A will not invalidate the memory cache on Node B, resulting in stale data reads.
- **Remediation**: Replace `InMemoryCache` with a shared Redis key-value store in production.

---

## 3. Database Bottlenecks

### 3.1 SQLite Lockups under Concurrent Writes
- **Location**: `backend/database.py`
- **Risk**: SQLite locks the database file on write operations. Under high concurrent QA usage (multiple clients dropping pins simultaneously), transactions fail with a `database is locked` error.
- **Remediation**: Ensure PostgreSQL (Neon) is configured for all environments except local development, and implement write retry loops.

---

## 4. Security Risks

### 4.1 Asset Redirect Loops and DNS Rebinding
- **Location**: `backend/utils/ssrf_guard.py`
- **Risk**: While `is_ssrf_safe` resolves hostnames to prevent private IP access, it does not prevent Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding attacks. A malicious site could return a public IP during resolution and a private IP during fetch.
- **Remediation**: Resolve hostnames once, cache the IP address, and route requests directly to the resolved IP while setting the original Host header.
