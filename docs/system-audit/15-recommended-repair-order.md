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
