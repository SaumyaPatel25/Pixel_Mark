# 12 Broken, Missing, and Hardening Needs

This document highlights critical areas of PixelMark that are failing in production, completely absent, or require significant architectural hardening.

## 1. Currently Broken

### Coordinate Placement (The Drift Bug)
- **Symptoms:** Markers placed on a target element often float far away when viewed on a different screen size or when the Canvas window is resized.
- **Root Cause:** `pixelmark-agent.js` calculates `x` and `y` strictly as viewport percentages (`clientX` / `window.innerWidth`), which inherently assumes all clients share the exact same aspect ratio and DOM layout.
- **Severity:** CRITICAL
- **Fix Direction:** Abandon absolute viewport math. Capture a unique CSS selector for the clicked element (e.g., `#main-cta-button`) and calculate the click's offset relative to the bounding box of that specific element.

### Cross-Origin (CORS) and Proxy Resilience
- **Symptoms:** Target websites (like Google) flood the console with 404s and CORS errors, and sometimes refuse to render inside the PixelMark canvas entirely.
- **Root Cause:** Standard proxying fails against `X-Frame-Options`, `Content-Security-Policy`, and internal sub-resource requests that expect to run on their origin domain.
- **Severity:** HIGH
- **Fix Direction:** The proxy middleware must actively strip restrictive headers (`X-Frame-Options`) from responses, but for complex sites, a browser extension (like the abandoned `pixelmark-lens`) is the only 100% reliable way to bypass these limits.

## 2. Partially Implemented

### Public Share Links
- **Symptoms:** External users get trapped in `/login` loops.
- **Root Cause:** `middleware.ts` enforces blanket protection over certain paths. The share routing logic is fighting the Next.js edge router.
- **Severity:** HIGH
- **Fix Direction:** Explicitly whitelist the `/review/[token]` URL pattern in `middleware.ts`. Ensure the backend provides a valid temporary session object instead of expecting a full `pm_token`.

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
