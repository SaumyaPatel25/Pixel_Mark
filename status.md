# STAGE Deployment Status & Audit Report

## 1. Current Audit Phase: Phase 1 Repository Recon
We are conducting a comprehensive repository-wide audit of STAGE to identify all systems, directories, canonical files, database structures, and runtime routing.

## 2. Directories & Subsystems Reviewed
- **Frontend (`web/`)**: Next.js app including `app/`, `components/`, `store/`, and `lib/`.
- **Backend (`backend/`)**: FastAPI server including `routes/`, `models/`, `services/`, and `tests/`.
- **Extension (`extension/`)**: Content/background script mapping for Chrome extension.
- **Tests (`tests/`)**: Pytest suites, Playwright E2E browser tests, and responsive layout validation scripts.

## 3. Key Findings & Structural Contradictions
1. **Authentication Conflict**: Stale Supabase routes and client configurations (`web/src/app/auth/callback/route.ts`, `web/src/lib/supabase.ts`, `web/src/lib/supabase/`) exist in the source tree but are dead/legacy code. The canonical login framework is Firebase Auth (GitHub, Google, Email link) synced to `/auth/firebase-sync` for JWT issuance.
2. **Partial Enforcement on Subscription Pause**: The `is_paused` Boolean flag is stored in the database (`subscriptions` table) and toggled via `/admin/toggle-pause`. However, it is never evaluated in the active entitlement resolution logic (`plan_capabilities.py`), meaning a paused organization retains active subscription entitlements.
3. **Plan Gating Cache**: backend uses an in-memory `_PLAN_CACHE` with a 45-second TTL. Database adjustments or webhook updates require calling `invalidate_org_plan_cache()` to reflect changes immediately; otherwise, client state may remain stale for up to 45 seconds.

## 4. Next Step
- Deliver the final structured audit report covering repository structure, canonical components, duplicate structures, and risk mitigation profiles.
