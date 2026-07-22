# 02 Repo File Map

This document maps the critical directories and files within the STAGE repository, identifying their purpose and current state of usability.

## Root Level
- `backend/` - Python/FastAPI source code and migration scripts.
- `web/` - TypeScript/Next.js frontend application.
- `stage-lens/` - Suspicious/experimental directory (likely a browser extension prototype or alternate injector).
- `docs/` - System audit and documentation files.
- `tests/` - Standalone test scripts (Python `verify_suite.py`, `e2e_test.py`).
- `.github/` & `.vercel/` - CI/CD and deployment configurations.
- `railway.toml` - Production backend deployment configuration.

## Backend (`backend/`)
### Core Entrypoints
- **`main.py`**
  - *Purpose:* FastAPI application entrypoint, CORS configuration, DB lifespan manager, and proxy fallback middleware.
  - *State:* Active, heavily modified, contains critical proxy routing logic.
- **`database.py`**
  - *Purpose:* SQLAlchemy engine and `AsyncSessionLocal` configuration.
  - *State:* Active.

### Domain Logic
- **`models/`**
  - *Purpose:* SQLAlchemy declarative base models (`User`, `Project`, `Session`, `Marker`).
  - *State:* Active, though migrations are often done via raw SQL in `main.py` lifespan rather than Alembic.
- **`schemas/`**
  - *Purpose:* Pydantic models for request/response validation.
  - *State:* Active, but prone to mismatches with SQLAlchemy models (e.g., the recent `description` bug).
- **`routes/` & `routers/`**
  - *Purpose:* API endpoints (e.g., `projects.py`, `sessions.py`, `markers.py`, `share_links.py`).
  - *State:* Active, but duplicated folder structures (`routes/` vs `routers/`) suggest historical refactoring debt.
- **`services/`**
  - *Purpose:* Business logic layer.
  - *State:* Partial. Many routes handle business logic directly instead of delegating to services.
- **`websocket.py`**
  - *Purpose:* Real-time marker sync and connection manager.
  - *State:* Active but highly fragile.

## Frontend (`web/`)
### Core Application
- **`src/app/`**
  - *Purpose:* Next.js App Router pages and layouts (`(dashboard)/`, `(auth)/`, `share/`).
  - *State:* Active. Highly reliant on client-side fetching (`'use client'`).
- **`src/components/`**
  - *Purpose:* Reusable React components (`ProjectCard.tsx`, `Marker.tsx`, `Canvas.tsx`).
  - *State:* Active, UI is mostly complete but wiring to backend is sometimes mocked or buggy.
- **`src/lib/`**
  - *Purpose:* API clients (`api.ts`), utilities, and request queuing (`apiQueue.ts`).
  - *State:* Active. `apiQueue.ts` handles request batching and retry logic.
- **`src/store/`**
  - *Purpose:* Global state management (Zustand).
  - *State:* Active, likely controls marker state and session metadata.
- **`src/middleware.ts`**
  - *Purpose:* Next.js edge middleware for route protection.
  - *State:* Active. Enforces auth guards on `/dashboard` and `/sessions`.

## Scripts & Utilities
- **`verify_suite.py` / `verify_suite_final.py`**
  - *Purpose:* Massive E2E test scripts for the backend.
  - *State:* Active, used heavily for regression testing during hardening phases.
- **`patch_coords.py` / `patch_coords.js`**
  - *Purpose:* Utility scripts attempting to fix the coordinate drift bugs.
  - *State:* Experimental/Patchwork.

---
- **Confidence Level:** High
- **Evidence Source:** `list_dir` on root, `backend/`, and `web/` directories.
- **Next File to Read:** `03-backend-architecture.md`
