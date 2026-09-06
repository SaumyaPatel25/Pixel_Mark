# Prompt Memory: Full Repository Audit & Organization

- **Execution Date**: 2026-09-03
- **Role**: Principal Software Architect & Top 1% Engineering Documentation Lead
- **Product**: STAGE (Legacy *PixelMark* references documented solely where relevant to historical database tables/cookies)
- **Core Objective**:
  - Read and absorb the entire STAGE repository without skipping files or inferring undocumented behavior.
  - Build complete architectural context across Frontend (Next.js 16 + Turbopack), Backend (FastAPI async + Neon PostgreSQL), Authentication (Firebase sync + direct GitHub OAuth), Billing & Entitlement gating (Dodo Payments), Proxy Engine & Injected Reviewer Agent, Blueprint Canvas vs Session Review boundaries, Zustand stores (20 stores), and DB schema/API routes.
  - Identify and organize scattered, misplaced, or duplicated files into production-grade canonical directories.
  - Update all affected import paths and ensure the entire fullstack app compiles and builds with zero errors.
  - Create and maintain `status.md` at repository root and log execution history in `docs/prompt-memory.md`.

---

## Actions Completed

### 1. Context Absorption
- Mapped all primary subsystems:
  - **Frontend Architecture**: Next.js 16.2.2 with Turbopack, App Router, 39 compiled routes, sandboxed proxy `<AuditSurface>` iframe container.
  - **Backend Architecture**: FastAPI ASGI server with connection pooling (`httpx.AsyncClient`), Neon DB PostgreSQL connection retry loop, and Redis broadcaster.
  - **Auth System**: Dual-track auth (direct GitHub OAuth with state verification + client Firebase SDK synced via Google Identity Toolkit verification on `/auth/firebase-sync`).
  - **Billing & Plan Gating**: Single source of truth in `services.plan_capabilities.PlanCapabilities`, Dodo Payments checkout and webhook processing, 45-second organization capability cache, 3-day grace period on past due accounts.
  - **Proxy Engine**: HTML rewriting pipeline (`backend/utils/proxy_rewriter.py`), SRI/CSP stripping, universal lazyload hydration (`installLazyloadHydrator`), and SSRF safeguards (`backend/utils/ssrf_guard.py`).
  - **Review Surfaces**: Clear separation between live interactive proxy session review (`/project/[id]`, `/review/[token]`) and multi-surface spatial planning (`/blueprint/[projectId]`).
  - **Zustand State Stores**: Mapped all 20 stores in `web/src/store/`.
  - **Data Schema**: Mapped all models across `backend/models/core.py`, `backend/markers/models.py`, and `backend/models/share_link.py`.

### 2. Directory Reorganization & Fixes
- **Hook Placement**:
  - Moved `web/src/lib/useSessionSocket.ts` to `web/src/hooks/useSessionSocket.ts`.
  - Added seamless re-export in `web/src/lib/useSessionSocket.ts`.
  - Updated consumers in `web/src/app/project/[id]/page.tsx` and `web/src/components/audit/AuditSurface.tsx`.
- **Backend Clean-Up**:
  - Removed dead prototype stub `backend/auth_routes.py`.
  - Moved migrations (`enhanced_core_migration.py`, `page_visit_migration.py`, `update_conservative_mode_migration.py`, `share_links_migration.sql`) to `backend/migrations/`.
  - Moved scripts (`fetch_imgs.py`, `test_query.py`, `test_db_create.py`, `check_db.py`, `setup_test_user.py`) to `backend/scripts/`.
  - Moved tests (`backend_e2e_tests.py`, `backend_test_phase_1.py`, `config_selftest.py`, `hardening_verify.py`, `test_srcset.py`, `test_stage_all.py`, `verify_stack.py`) to `backend/tests/`.
- **TypeScript Stabilization**:
  - Added `browser_info`, `device_pixel_ratio`, and `devicePixelRatio` to `CapturePayload` and `CaptureContext` interfaces in `web/src/components/audit/AuditSurface.tsx`.
  - Verified `npm run build` in `web/`: Compiled successfully in Turbopack, TypeScript checked 39 routes with **0 errors**.

### 3. Deliverables Status
- `status.md` generated at repository root.
- `docs/prompt-memory.md` generated in `docs/`.
- Working tree clean and verified.

### 4. Core Structural Documentation Delivery
- Generated `docs/architecture.md`:
  - Defined high-level boundaries across Client Tier, Edge Ingress, FastAPI Backend, Persistence, and External Targets.
  - Authored Mermaid.js sequence diagram tracing end-to-end Proxy Engine request flow.
  - Documented strict boundary between Blueprint Canvas and Session Review.
  - Included Mermaid.js infrastructure deployment topology.
- Generated `docs/system-design.md`:
  - Detailed runtime execution critical paths for session initialization, pin capture, and DOM mutation injection.
  - Documented WebSocket multiplayer protocols (`/ws/sessions/{id}` and `/ws/canvas/{id}`) with Redis Pub/Sub horizontal scaling and local degraded fallback.
  - Detailed security controls: SSRF defense-in-depth pipeline (DNS resolution, private/link-local/metadata IP blocking, manual redirect loop verification), header stripping, and iframe sandboxing.
  - Documented operational scaling bottlenecks: heavy WebGL/Three.js context loss handling, concurrent WebSocket fan-out, Neon database connection pooling, and asset cache memory pressure. Identified areas requiring production log verification with standardized callouts.

### 5. Data Layer & Business Logic Documentation Delivery
- Generated `docs/api.md`:
  - Mapped all active REST and WebSocket endpoints across Auth, Projects, Sessions, Blueprint, Proxy, Markers, and Billing domains.
  - Specified request/response Pydantic payload models, Bearer JWT / Guest token requirements, and HTTP status codes.
- Generated `docs/db.md`:
  - Documented PostgreSQL schema on Neon Serverless with historical Supabase migration background.
  - Entity-relationship diagram and detailed table definitions covering Users, Organizations, Projects, Sessions, CanvasFrames, Blueprint DOM Edits, Markers, and Subscriptions.
  - Full foreign key cascade rules and deletion policies.
- Generated `docs/logic.md`:
  - Specified Entitlement Resolver rules (`PlanCapabilities`, plan matrix, 3-day grace period, 45-second cache, founder auto-provisioning).
  - Specified Canonical Identity Resolver (`resolve_canonical_user`, provider linking, email collision resolution, workspace bootstrapping).
  - Specified Reverse Proxy rewriter pipeline (HTML sanitization, Universal Lazyload Hydration, `data-bg` URL extraction, 1x1 transparent PNG fallback, SameSite cookie isolation).

### 6. State Management, Tech Stack & Onboarding Delivery
- Generated `docs/memory.md`:
  - Cataloged all 20 Zustand stores in `web/src/store/`.
  - Documented optimistic local UI mutations with server reconciliation and rollback handling.
  - Documented dual Undo/Redo systems: granular property tweaks (`useUndoRedoStore`, 50 actions capped) and macro spatial snapshots (`useBlueprintStore`, 30 snapshots capped, `resetToBase`).
- Generated `docs/tech-stack.md`:
  - Documented complete stack across Frontend (Next.js 16, React 19, Tailwind v4, Zustand v5), Backend (FastAPI, Uvicorn, HTTPX, SQLAlchemy 2.0 Async, asyncpg), and Persistence/Cloud (Neon Serverless, Redis, Dodo Payments, Google Identity Toolkit, GitHub OAuth, Resend, Vercel, Render).
- Upgraded `README.md`:
  - Production SaaS structure with badges, 1-sentence value proposition, system Mermaid diagram, local development quickstart guide, and hyperlinked documentation index.

### 7. Master Audit Report Delivery
- Generated **`AUDIT.md`** at repository root and **`docs/audit.md`** in `docs/`:
  - Executive summary and audit methodology (file-by-file code review).
  - Exhaustive breakdown of Reverse Proxy Rewriter, Injected Reviewer Agent, Decoupled Auth & Canonical Identity, Dodo Payments Billing & Grace Period, Blueprint Canvas vs Session Review, Realtime Multiplayer, and State Management.
  - Security and hardening matrix: SSRF protection, CSP/X-Frame-Options/SRI stripping, SameSite cookie isolation, and iframe sandboxing.
  - Complete Directory Hygiene & Clean-Up Log (18 files organized or pruned).
  - Build & Verification Matrix (Python `py_compile` clean, Next.js 16 Turbopack 39 routes 0 errors).
  - Architectural observations and recommendations.

### 8. Final Milestone Status
- Complete Repository Audit: **100% COMPLETE**.
- Master Audit File: Generated at **`AUDIT.md`** and **`docs/audit.md`**.
- All documentation files generated, verified against code, and cross-referenced.
