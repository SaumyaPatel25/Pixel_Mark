# AI Agent Hand-off and Development Guidelines

This document provides guidelines, constraints, and checklist items for subsequent AI agents working on this codebase.

---

## 1. Architectural Constraints

### 1.1 Server-Side Request Forgery (SSRF) Guard
- **Rule**: All proxy routes must pass target URLs through `is_ssrf_safe`. 
- **Constraint**: Private, loopback, and link-local IP addresses are blocked. Loopback (`127.0.0.1`, `::1`) is permitted only in local development (`DEBUG=True`).
- **Code**: `backend/utils/ssrf_guard.py`

### 1.2 Domain Locking Scopes
- **Rule**: Reviews are scoped to the project's base URL domain.
- **Constraint**: Navigating to external sites returns a `403 Forbidden` unless the domain is whitelisted (common CDNs: Cloudflare, Tailwind CSS, Google Fonts, unpkg).
- **Code**: `backend/utils/ssrf_guard.py:34-48`

### 1.3 Onboarding Auto-Start Gate
- **Rule**: The "Product Tour" guide must auto-start only if the user has **logged in successfully**, has **zero projects** (`projects.length === 0`), and has **not already dismissed or completed the tour**.
- **Code**: `web/src/app/(dashboard)/DashboardLayoutClient.tsx`

### 1.4 Database Connection retries
- **Rule**: Neon connection pools must retry connecting up to 5 times with exponential backoff on startup.
- **Code**: `backend/main.py:25-64`

---

## 2. Common Pitfalls to Avoid

### 2.1 API Port Mismatches
- **Pitfall**: Running uvicorn on its default port `8000`. The frontend is configured to target port `8765`.
- **Remedy**: Always start uvicorn targeting `--port 8765`. Use the fullstack runner script `python run_app.py`.

### 2.2 VRAM Thrashing Float Animations
- **Pitfall**: Running float animations during page scrolls, causing rendering lag.
- **Remedy**: Always use scroll listeners to pause animations when scrolling.
- **Code**: `web/src/components/marketing/HeroSection.tsx`

### 2.3 Breaking Optimistic UI Rollbacks
- **Pitfall**: Updating state stores without providing rollback mechanisms.
- **Remedy**: When implementing mutations, save a copy of the original state. If the API returns an error or a `409 Conflict` version mismatch, revert the state to the original copy.
- **Code**: `web/src/store/markerStore.ts`

---

## 3. Checklist for Implementing New Features

### Step 1: Database and Schema Changes
- Define the new SQLAlchemy model in `backend/models/core.py`.
- Run Alembic to generate a migration script:
  ```bash
  alembic revision --autogenerate -m "Add new entity"
  ```
- Define corresponding Pydantic validation schemas in `backend/schemas/core.py`.

### Step 2: REST Router Endpoints
- Register the routes in a dedicated router file under `backend/routers/` or `backend/routes/`.
- Ensure routes include dependency checks (`get_current_user` or `get_db`).
- Apply cache invalidation helpers when modifying data:
  ```python
  cache.invalidate(f"user:{current_user.id}:*")
  ```

### Step 3: Frontend Store Integration
- Create or update the relevant Zustand store in `web/src/store/`.
- Use the `persist` middleware if the data needs to persist across reloads.
- Implement optimistic updates for UI actions, with rollback safety.

### Step 4: Verification
- Run backend tests: `pytest`
- Run frontend tests: `npm run test`
- Manually verify the changes using the **Manual QA Playbook**.
