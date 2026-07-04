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
