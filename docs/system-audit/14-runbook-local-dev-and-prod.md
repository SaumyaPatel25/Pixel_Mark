# 14 Runbook: Local Dev & Production

This document serves as the operational runbook for compiling, running, and diagnosing STAGE locally and in production.

## 1. Local Development Setup

### Backend (FastAPI)
1. **Navigate:** `cd backend`
2. **Environment:** Ensure `.env` exists with `DATABASE_URL` (SQLite or a local Postgres string).
3. **Dependencies:** `pip install -r requirements.txt` (or activate your `venv`).
4. **Run Server:** 
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
5. **Local URL:** `http://127.0.0.1:8000`
6. **Docs:** `http://127.0.0.1:8000/docs`

### Frontend (Next.js)
1. **Navigate:** `cd web`
2. **Environment:** Ensure `.env.local` contains `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
3. **Dependencies:** `npm install`
4. **Run Server:** 
   ```bash
   npm run dev
   ```
5. **Local URL:** `http://localhost:3000`

## 2. Production Deployment

### Backend (Railway)
- **Framework:** Deployed via Nixpacks (using `nixpacks.toml` and `Procfile`).
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Env Vars Required:**
  - `DATABASE_URL` (Neon Postgres)
  - `JWT_SECRET`
  - `FRONTEND_URL` (e.g., `https://stage.app`)

### Frontend (Vercel)
- **Framework:** Next.js Serverless Edge
- **Env Vars Required:**
  - `NEXT_PUBLIC_API_URL` (e.g., `https://stage-production.up.railway.app`)

## 3. Common Failure Points & Quick Smokes
- **Symptom:** App hangs on login or shows 401s constantly.
  - *Fix:* Clear your browser's Local Storage and Cookies. The desync between `stagetoken` and JWT cache is a known issue.
- **Symptom:** Dashboard 500 error when clicking a project.
  - *Fix:* The backend schema is likely out of sync with the DB model. Run a quick check on the `/projects/` endpoint via the Swagger `/docs` to see exactly which field is causing the `AttributeError`.
- **Symptom:** Markers drop but don't show up for other users.
  - *Fix:* Inspect the network tab for `WebSocket` connections. Ensure it says `101 Switching Protocols`. If it drops instantly, the Railway instance may be memory-bound or the `session_id` logic failed.

---
- **Confidence Level:** High
- **Evidence Source:** Standard ASGI/Next.js practices combined with the repo's actual config files (`railway.toml`, `.vercel`).
- **Next File to Read:** `15-recommended-repair-order.md`
