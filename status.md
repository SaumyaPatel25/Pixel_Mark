# STAGE Architecture Status & System Audit Report

**Report Date**: 2026-09-03  
**Audit Lead**: Principal Software Architect & Engineering Documentation Lead  
**Product**: STAGE (Legacy references noted as *PixelMark* where preserving schema/migration parity)  
**System State**: Fully Audited & Cleanly Organized (Frontend Next.js 16 build passing with 0 errors)

---

## 1. Executive Summary & Current Audit Phase

### Current Milestone: Full Repo Audit & Organization
A file-by-file audit and directory reorganization has been completed across the entire STAGE repository. No product logic, billing calculation, proxy engine rewrite rules, or Blueprint feature contracts were altered. The codebase has been brought to production-grade directory standards: stray scripts, obsolete stubs, misplaced hooks, and scattered migration files have been systematically organized into canonical directories, and all affected import paths have been updated and verified.

---

## 2. Comprehensive System Architecture Map

### 2.1 Framework & Runtime Topology
- **Frontend**: Next.js 16.2.2 (Turbopack, App Router, React 19, Tailwind CSS v4, Lucide React).
  - Production build: `39 routes` (Static pre-rendered + Dynamic server-rendered via Edge/Node runtimes).
  - Base Directory: `web/` (Source in `web/src/`).
- **Backend**: FastAPI 0.115+ running on Python 3.11 with asynchronous ASGI event loop.
  - Server runner: Uvicorn (`backend.main:app`) on port `8765`.
  - Database: PostgreSQL on Neon Serverless (pgbouncer pool mode) via `asyncpg` + SQLAlchemy 2.0 async engine (`pool_pre_ping=True`, `statement_cache_size=0`).
  - Base Directory: `backend/`.
- **Fullstack Runner**: `run_app.py` in root orchestrates both Uvicorn and Next.js dev server with process group termination (`taskkill /F /T`).

### 2.2 Authentication Flow (Firebase + GitHub Separated)
STAGE implements two decoupled, canonical authentication tracks unified into a single internal User identity:

1. **GitHub OAuth Flow (Backend-Initiated Direct)**:
   - Route `GET /auth/oauth/github/start`: Generates cryptographic state cookie, constructs GitHub authorization URL (`scope=user:email`), and redirects the browser.
   - Route `GET /auth/oauth/github/callback`: Validates state cookie against CSRF, exchanges code for access token via `https://github.com/login/oauth/access_token`, retrieves user profile and primary email from GitHub API, and calls `services.identity_resolver.resolve_canonical_user(provider="github", ...)`.
   - Issues internal STAGE JWT access token and redirects to `${frontend_url}/auth/oauth-callback?token=${token}`.

2. **Firebase Auth Flow (Client-Initiated + Backend Token Verification)**:
   - Frontend utilizes Firebase SDK (`web/src/lib/firebase.ts`) for Google OAuth, Email Link / Passwordless, and Email/Password credentials.
   - Client sends Firebase `id_token` to `POST /auth/firebase-sync`.
   - Backend calls Google Identity Toolkit API (`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}`) to verify the token without heavy admin SDK dependencies.
   - Extracts verified email, user metadata, and provider info (`providerUserInfo`), links `UserIdentity` record in database, and issues internal STAGE JWT.

### 2.3 Billing & Entitlement Gating (Dodo Payments)
- **Engine**: Single source of truth in `backend/services/plan_capabilities.py` (`PlanCapabilities`).
- **Subscription Tiers**:
  - `none` / Free: 1 seat, 1 project, no Blueprint DOM edit, read/comment only.
  - `dev_team` / `dev_team_early_bird`: 5 seats, 10 projects, Blueprint DOM edits enabled. Tracked via `early_bird_counter` table (first 100 spots capped).
  - `stage_team`: Unlimited seats & projects, priority support, full Blueprint DOM editing.
  - `enterprise`: Custom quota limits and dedicated SLA.
- **Webhook Processing**: `POST /billing/webhook` handles Dodo webhook events (`payment.succeeded`, `subscription.active`, `subscription.renewed`, `subscription.cancelled`, `subscription.failed`, `subscription.on_hold`). Idempotency is enforced via Redis key `dodo_webhook:{event_id}` (or 24h in-memory fallback).
- **Grace Period**: 3-day grace period on `past_due` subscriptions with warning banner before downgrade enforcement.
- **Plan Resolution Cache**: `_PLAN_CACHE` in `backend/services/plan_capabilities.py` caches capabilities per organization with a 45-second TTL. Requires calling `invalidate_org_plan_cache(org_id)` upon webhook processing.

### 2.4 Proxy Engine & Injected Agents
- **Reverse Proxy**: `backend/routes/proxy.py` and `backend/main.py` (`proxy_fallback_middleware`).
  - Document Route: `GET /proxy/session/{session_id}/page?url={target_url}`.
  - Asset Route: `GET/POST /proxy/session/{session_id}/asset/{scheme}/{host}/{path:path}`.
  - Fallback Interceptor: Intercepts unreserved non-API requests from iframe referer/cookie (e.g. Next.js `/_next/...` bundles, font files, images) and proxies them to the target origin.
  - SSRF Safeguard: `backend/utils/ssrf_guard.py` enforces private IP, loopback, link-local, AWS/cloud metadata IP blocks, and domain scoping per session.
- **HTML Rewriter**: `backend/utils/proxy_rewriter.py` (`rewrite_html`).
  - Injects `STAGE_BOOTSTRAP` declaring `__STAGE_SESSION_ID__`, `__STAGE_TARGET_URL__`, `__STAGE_TARGET_ORIGIN__`, `__STAGE_PROXY_ORIGIN__`.
  - Installs Universal Lazyload Hydrator (`installLazyloadHydrator`) for Nicepage, Webflow, Shopify, WordPress lazyload images (`data-src`, `data-bg`, `data-srcset`) safely guarded with `:not([data-stage-hydrated])`.
  - Rewrites media tags, CSS `url(...)` declarations, strips SRI `integrity` hashes, strips CSP headers, strips `autofocus`, and removes Cloudflare Rocket Loader.
  - Injects `stage-agent.js` deferred script.
- **Injected Reviewer Agent**: `backend/static/stage-agent.js` (3,800+ lines).
  - Multi-Signal Site Readiness: Observes DOM loading, WebGL/Three.js canvases, requestAnimationFrame loops, and posts `STAGE_SITE_READY` to parent window.
  - Click & Pin Capture: Coordinates DOM node identification, XPath generation, CSS selector generation, bounding client rect capture, and iframe-to-parent messaging via `window.postMessage`.

### 2.5 Blueprint Canvas vs Session Review Boundaries
The platform maintains strict functional and data boundaries between two distinct review surfaces:

| Dimension | Session Review (`/project/[id]`, `/review/[token]`) | Blueprint Canvas (`/blueprint/[projectId]`) |
| :--- | :--- | :--- |
| **Primary Purpose** | Live interactive QA of external websites inside proxy iframe | Spatial infinite canvas for multi-surface planning & visual flows |
| **Canvas Engine** | Sandboxed `iframe` rendering proxied target HTML + `stage-agent.js` | Custom SVG/HTML infinite canvas (`BlueprintCanvas.tsx`) with pan/zoom |
| **Data Anchors** | DOM nodes (`selector`, `xpath`), viewport absolute, canvas 3D | Canvas frames (`CanvasFrame`), connectors, notes, sections |
| **Edit Model** | `DOMEdit` (runtime CSS overrides and text edits on proxy session) | `BlueprintDomTarget`, `BlueprintDomEditSet`, `BlueprintDomEditOperation` |
| **WebSocket** | `/ws/sessions/{session_id}` (pins, edits, reviewer identity) | `/ws/projects/{project_id}/blueprint` (spatial cursor, pan/zoom sync) |
| **Summary Service**| Session activity & reviewer feedback feeds | `services.blueprint_summarizer` (AI spatial layout summarization) |

### 2.6 Zustand State Store Inventory (`web/src/store/`)
All 20 stores follow modular single-responsibility design:
1. `aiProviderStore.ts`: BYOK provider configs (OpenAI, Anthropic, Gemini, Groq, custom).
2. `authStore.ts`: User profile, JWT token persistence, active organization, logout.
3. `blueprintActivityStore.ts`: Activity log and timeline events for Blueprint canvas.
4. `blueprintCollaborationStore.ts`: Remote peer cursors, selection bounding boxes on Blueprint.
5. `blueprintStore.ts`: Viewport transforms (x, y, zoom), frames, nodes, tool selection.
6. `blueprintSummaryStore.ts`: AI-generated spatial canvas architecture summaries.
7. `domEditStore.ts`: Active visual CSS/text edits applied in review sessions.
8. `markerStore.ts`: Review pins/markers, active marker filter, draft markers, screenshot attachments.
9. `onboardingStore.ts`: Interactive step-by-step product walkthrough tour.
10. `overlayStore.ts`: Modal dialogs, feedback drawer, screenshot capture overlay.
11. `projectStore.ts`: Projects list, active project metadata, environments list.
12. `realtimeStore.ts`: Global WebSocket connection status and reconnect telemetry.
13. `screenshotStore.ts`: In-browser screen capture state (html2canvas / mediaDevices).
14. `sessionStore.ts`: Current session ID, site readiness status, initial URL.
15. `themeStore.ts`: Dark / light mode state.
16. `uiStore.ts`: Shell layout, sidebar collapse, command palette state.
17. `undoRedoStore.ts`: Undo/redo action history stack for canvas and markers.
18. `useBillingStore.ts`: Dodo subscription plan, status, quota usage, checkout modal.
19. `useBlueprintPresenceStore.ts`: Multi-user frame presence in Blueprint.
20. `useNotificationStore.ts`: In-app notification drawer, unread counters.

### 2.7 Database Schema & API Route Inventory
- **Core Entities (`backend/models/core.py`)**:
  - Identity & Access: `User`, `UserIdentity`, `UserAIProviderConfig`, `AuthToken`, `ApiKey`
  - Workspace: `Organization`, `OrgMember`, `OrgInvite`, `Project`, `Environment`
  - Review & Sessions: `Session`, `PageVisit`, `AuditArtifact`, `DOMEdit`, `ShareLink`
  - Markers (`backend/markers/models.py`): `Marker`, `ReviewerIdentity`
  - Blueprint: `CanvasFrame`, `CanvasFlow`, `BlueprintDomTarget`, `BlueprintDomEditSet`, `BlueprintDomEditOperation`, `BlueprintMutationModel`, `BlueprintPublicationModel`, `BlueprintCommentModel`, `BlueprintStatusHistoryModel`, `BlueprintActivityModel`, `BlueprintSummaryModel`
  - Notifications: `NotificationEventModel`, `NotificationPreferencesModel`, `NotificationDeliveryAttemptModel`
  - Billing: `SubscriptionModel`, `EarlyBirdCounterModel`, `ReviewerDomEditSuggestionModel`, `EntitlementAuditLogModel`, `RedemptionCodeModel`, `RedemptionCodeUseModel`
- **Mounted API Routers (`backend/main.py`)**:
  - `/auth`: Authentication & OAuth endpoints
  - `/projects`: Project and environment management
  - `/sessions`: Review session lifecycle
  - `/canvas`: Canvas frame and flow persistence
  - `/shares`: Session and project share links
  - `/share-links`: Unified password-protected guest reviewer links
  - `/review`: Reviewer guest authentication and session context
  - `/ai`: AI assist for comments, triage, and DOM modifications
  - `/ai/providers`: User BYOK encrypted API key settings
  - `/proxy`: Reverse proxy document and asset endpoints
  - `/export`: JSON, ZIP, and GitHub Issue sync
  - `/websocket`: Session multiplayer WebSocket
  - `/ws/projects/{project_id}/blueprint`: Spatial multiplayer WebSocket
  - `/flags`: Runtime feature flags
  - `/screenshot`: Headless browser capture
  - `/sessions/{session_id}/dom-edits`: Session DOM edit operations
  - `/projects/{project_id}/blueprint/...`: Blueprint DOM edit targets
  - `/settings`: User and organization configuration
  - `/markers`: Unified review pin CRUD, comments, and triage
  - `/realtime`: Presence tracking
  - `/notifications`: In-app notification feeds and preference settings
  - `/billing`: Dodo checkout and webhook handlers
  - `/invites`: Organization invitation acceptance
  - `/admin`: Early-bird metrics and platform controls
  - `/redemption`: Promotional code redemption

---

## 3. Directory Organization & Clean-Up Log

### 3.1 Misplaced Hook Reorganization
- **`web/src/lib/useSessionSocket.ts`** -> Moved to canonical hook location **`web/src/hooks/useSessionSocket.ts`**.
  - Updated internal imports to resolve `@/lib/reviewerIdentity` and `@/lib/api`.
  - Updated imports in `web/src/app/project/[id]/page.tsx` and `web/src/components/audit/AuditSurface.tsx` to `@/hooks/useSessionSocket`.
  - Left backwards-compatible re-export in `web/src/lib/useSessionSocket.ts` to prevent any regressions for external or legacy consumers.

### 3.2 Backend Codebase Clean-Up
- **Deleted Dead Code**:
  - `backend/auth_routes.py`: Removed stale 38-line prototype stub that referenced deprecated imports and was never mounted in `backend/main.py`.
- **Organized Migrations** (moved into `backend/migrations/`):
  - `backend/enhanced_core_migration.py` -> `backend/migrations/enhanced_core_migration.py`
  - `backend/page_visit_migration.py` -> `backend/migrations/page_visit_migration.py`
  - `backend/update_conservative_mode_migration.py` -> `backend/migrations/update_conservative_mode_migration.py`
  - `backend/share_links_migration.sql` -> `backend/migrations/share_links_migration.sql`
- **Organized Utility Scripts** (moved into `backend/scripts/`):
  - `backend/fetch_imgs.py` -> `backend/scripts/fetch_imgs.py`
  - `backend/test_query.py` -> `backend/scripts/test_query.py`
  - `backend/test_db_create.py` -> `backend/scripts/test_db_create.py`
  - `backend/check_db.py` -> `backend/scripts/check_db.py`
  - `backend/setup_test_user.py` -> `backend/scripts/setup_test_user.py`
- **Organized Test Suites** (moved into `backend/tests/`):
  - `backend/test_srcset.py` -> `backend/tests/test_srcset.py`
  - `backend/backend_e2e_tests.py` -> `backend/tests/backend_e2e_tests.py`
  - `backend/backend_test_phase_1.py` -> `backend/tests/backend_test_phase_1.py`
  - `backend/config_selftest.py` -> `backend/tests/config_selftest.py`
  - `backend/hardening_verify.py` -> `backend/tests/hardening_verify.py`
  - `backend/test_stage_all.py` -> `backend/tests/test_stage_all.py`
  - `backend/verify_stack.py` -> `backend/tests/verify_stack.py`

### 3.3 TypeScript & Build Stabilization
- Fixed TypeScript type error in `web/src/components/audit/AuditSurface.tsx` where `browser_info`, `device_pixel_ratio`, and `devicePixelRatio` were accessed on untyped payload interfaces. Added proper field definitions to `CapturePayload` and `CaptureContext`.
- Verified production build: Next.js 16.2.2 with Turbopack compiles all 39 routes with **0 errors**.

---

## 4. Key Architectural Ambiguities & Codebase Observations

1. **Dead Legacy Supabase Artifacts in Frontend**:
   - `web/src/lib/supabase.ts`, `web/src/lib/supabase-server.ts`, and `web/src/app/auth/callback/route.ts` remain from an earlier Supabase prototype. The client in `supabase.ts` is a dummy stub (`// Supabase is deprecated in favor of Neon DB / Backend API`). STAGE uses Neon PostgreSQL on the backend with Firebase Sync and GitHub direct OAuth. While dead code does not affect the build, removing these in a dedicated cleanup PR will prevent developer confusion.
2. **Subscription Pause Enforcement**:
   - The `subscriptions` table includes an `is_paused` flag toggled by `/admin/toggle-pause`. However, `PlanCapabilities.get_capabilities()` in `backend/services/plan_capabilities.py` currently gates capabilities based on `plan_type` and `status` (`past_due`, `canceled`, `active`, `none`) without checking `is_paused`. If subscription pausing is intended to suspend entitlements, `is_paused` should be factored into `get_capabilities()`.
3. **Plan Cache Invalidation Requirement**:
   - `backend/services/plan_capabilities.py` uses an in-memory `_PLAN_CACHE` with a 45-second TTL. Immediate reflection of plan changes (e.g., from webhook receipts or manual redemptions) requires explicit calls to `invalidate_org_plan_cache(org_id)`.
4. **Dual Router Folders in Backend**:
   - Routers are currently split between `backend/routes/` (e.g. `auth.py`, `proxy.py`, `sessions.py`) and `backend/routers/` (e.g. `review.py`, `ai.py`, `dom_edits.py`, `share_links.py`). Both are mounted into `backend/main.py`. Standardizing to a single `backend/routes/` directory in a future milestone will unify backend conventions.
5. **Legacy Naming Artifacts**:
   - Older SQLite test files (`pixelmark.db`) and fallback cookies (`pixelmark_session_id`) reflect historical naming. The active product name and canonical contract across all public interfaces is strictly **STAGE** (cookie: `stagesessionid`).

---

## 5. Core Documentation Deliverables Generated

1. **`docs/architecture.md`**:
   - High-level system boundaries (Client Tier, Edge Ingress, FastAPI Backend, Persistence, External Targets).
   - End-to-end Proxy Engine request sequence diagram (HTML rewriting, SRI/CSP stripping, lazyload hydration, asset caching).
   - Strict boundary matrix between Blueprint Canvas (spatial multi-surface planning) and Session Review (live proxy DOM auditing).
   - Mermaid.js infrastructure topology.

2. **`docs/system-design.md`**:
   - Runtime execution critical paths (review session initialization, interactive pin placement, DOM mutation replaying).
   - Realtime multiplayer sequence diagram (`/ws/sessions/{id}` presence and `/ws/canvas/{id}` spatial cursor sync).
   - Security controls (defense-in-depth SSRF pipeline with IP/CIDR blocking and redirect hop validation, header stripping, iframe sandboxing).
   - Scaling bottlenecks and mitigations (heavy WebGL shader context loss handling, concurrent WebSocket fan-out, Neon database connection pooling, asset memory pressure).

3. **`docs/api.md`**:
   - Active REST and WebSocket endpoint directory grouped by domain (Auth, Projects, Sessions, Blueprint, Proxy, Markers, Billing).
   - Request/response payload schemas, Bearer/Cookie authentication mechanisms, and known error status codes.

4. **`docs/db.md`**:
   - PostgreSQL schema specification for Neon serverless, including historical migration context from early Supabase prototypes.
   - Entity-relationship diagram and table attribute breakdown across Users, Orgs, Projects, Sessions, Frames, Blueprint Edits, Markers, and Notifications.
   - Comprehensive foreign key cascade rules and deletion policies.

5. **`docs/logic.md`**:
   - Technical logic specification covering the Entitlement Resolver (`PlanCapabilities`, 45-second cache, 3-day grace period, auto-provisioning).
   - Canonical Identity Resolver (`resolve_canonical_user`, multi-provider account binding, founder account merging).
   - Reverse Proxy rewriter mechanics (HTML sanitization, Universal Lazyload Hydration, `data-bg` URL parsing, 1x1 transparent PNG fallback, SameSite cookie isolation).

6. **`docs/memory.md`**:
   - Comprehensive frontend state management and memory lifecycle guide.
   - Catalog of all 20 Zustand stores in `web/src/store/`.
   - Optimistic UI updates with authoritative server reconciliation architecture.
   - Dual Undo/Redo/Reset history engines (Session CSS tweaks vs Blueprint spatial snapshots).

7. **`docs/tech-stack.md`**:
   - Complete inventory of frameworks, libraries, and external cloud infrastructure across frontend, backend, and persistence.
   - Exact version numbers, architectural roles, and deployment topology (Vercel, Render, Neon, Redis, Dodo Payments).

8. **`README.md`**:
   - Production SaaS README with value proposition, system badges, visual Mermaid topology, quickstart guide, and hyperlinked documentation directory.

---

## 6. Audit & Documentation Phase Completion

- **Overall Status**: **100% COMPLETE**
- **Master Audit Report**: **`AUDIT.md`** (Root) & **`docs/audit.md`**
- **Core Architecture Specs**: 7 detailed documents in `docs/` (`architecture.md`, `system-design.md`, `api.md`, `db.md`, `logic.md`, `memory.md`, `tech-stack.md`).
- **Platform Onboarding**: Upgraded production **`README.md`**.
- **System Health**: Backend Python modules compile with zero errors; Next.js 16 production build compiles with **0 errors** across all 39 static and dynamic routes.

