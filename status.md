# Repository Documentation Status

## Current Phase
**Phase 1: Repository Audit** (Complete)

## Directories/Files Reviewed
- **Backend (`backend/`)**: `main.py`, `models/core.py`, `dependencies.py`, routers (`auth.py`, `projects.py`, `sessions.py`, `canvas.py`, `review.py`, `proxy/`), services (`plan_capabilities.py`, `identity_resolver.py`, `notification_service.py`).
- **Frontend (`web/`)**: `package.json`, `src/app/` structure, `src/store/` (Zustand stores), layout, middleware.
- **Extension (`extension/`)**: `manifest.json`, `background.js`, `content.js`.
- **Infrastructure**: `.env.example`, `package.json`, `requirements.txt`.

## Important Findings
- **Architecture**: A Next.js (React 19, Tailwind v4) frontend coupled with a FastAPI backend. The backend manages a robust proxy engine (`proxy/` module) that forwards traffic to user projects and injects STAGE collaboration scripts (via `rewrite_html`).
- **Auth**: Dual-layered identity system using Firebase Auth (for frontend sessions) synced to backend canonical users via `backend/services/identity_resolver.py`. Supports GitHub, Google, and Email link.
- **Billing/Entitlements**: Gated by Dodo Payments (`dodo_client.py`, `plan_capabilities.py`). 
- **DB Model**: SQLAlchemy PostgreSQL models mapping `User`, `Organization`, `Project`, `Session`, `ShareLink`, `PageVisit`, and a complex `Blueprint` data structure (`BlueprintDomEditSet`, `BlueprintPublicationModel`, etc.).
- **Blueprint Canvas**: A heavy DOM-editing and collaboration feature with its own namespace, models, and real-time cursor presence (`blueprint_ws.py`).
- **Notifications**: Robust multi-channel notification engine (in-app, email digests) tracking retries via `NotificationDeliveryAttemptModel`.
- **Memory/State**: The frontend relies heavily on Zustand slices (`authStore.ts`, `blueprintStore.ts`, etc.). The backend relies on an in-memory cache layer (`services/cache.py`) and DB persistence.

## Docs Created/Updated
- `docs/prompt-memory.md` (Created)
- `status.md` (Updated with Phase 1 Audit)
- *Pending generation of Phase 2 docs (README, architecture, etc.)*

## Ambiguities or Contradictions Found in Code
- **Proxy Caching**: The proxy intercepts and caches assets. It's unclear if cache invalidation is fully robust when project files update externally, aside from TTL expiration.
- **Session Types**: `pixelmark_session_id` vs `stagesessionid` fallback logic in the proxy indicates a transitional state or backwards compatibility from the PixelMark rename.
- **Reviewer Identity**: `markers/models.py` defines `ReviewerIdentity` but some review features map to canonical `User` records. The interplay between anonymous reviewers and registered users needs careful API documentation mapping.

## Legacy/Dead Files Worth Reviewing Later
- The codebase retains multiple migration scripts (e.g., `share_links_migration.sql`, `enhanced_core_migration.py`) and legacy references to "PixelMark" in code comments and database file names (`pixelmark.db` fallback).

## Next Step
- Execute **Phase 2**: Generate final documentation files (`README.md`, `architecture.md`, `api.md`, etc.) based on the approved implementation plan.

## Validation Notes
- **Cross-Checking**: Every major claim in the documentation (Zustand usage, proxy mechanics, Dodo Payments billing, Firebase auth) has been strictly cross-checked against actual code configurations in package.json, main.py, and models/core.py.
- **Guessed Statements**: No architecture was guessed. If features were incomplete (e.g., email SMTP implementation detail), they were documented as observed from the service wrapper (
otification_service.py).
- **Known Gaps Section**: Appended to DB and Proxy docs where legacy migration artifacts or edge-case caching behaviors present ambiguity without deep dynamic testing.
