# STAGE Developer Setup Guide

This guide walks you through setting up and launching the complete STAGE full-stack platform locally.

---

## 1. System Prerequisites

- **Python**: 3.11+ (asyncio, FastAPI, SQLAlchemy)
- **Node.js**: 20.x+ (npm / pnpm / yarn)
- **Database**: PostgreSQL (Neon Serverless in production, or SQLite automatically for local offline development)

---

## 2. Quickstart (One Command)

From the project root directory:

```bash
# Launch both Backend (http://localhost:8765) and Frontend (http://localhost:3000)
python run_app.py
```

`run_app.py` checks virtual environment health, verifies backend dependencies, seeds initial development tables, boots Next.js with Turbopack, and streams color-coded logs.

---

## 3. Manual Component Setup

### A. Backend Setup (`/backend`)

1. **Create and activate virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *Key variables*:
   - `DATABASE_URL`: PostgreSQL connection string (defaults to `sqlite+aiosqlite:///./test.db` if unset).
   - `JWT_SECRET_KEY`: Random 256-bit secret string for auth token signing.
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For developer GitHub OAuth.
   - `CORS_ORIGINS`: Comma-separated allowlist (e.g. `http://localhost:3000,http://127.0.0.1:3000`).

4. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

5. **Start FastAPI development server**:
   ```bash
   uvicorn main:app --reload --port 8765 --host 0.0.0.0
   ```

---

### B. Frontend Setup (`/web`)

1. **Install Node dependencies**:
   ```bash
   cd web
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   *Key variables*:
   - `NEXT_PUBLIC_API_BASE`: `http://localhost:8765`
   - `NEXT_PUBLIC_WS_BASE`: `ws://localhost:8765`
   - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`

3. **Start Next.js development server**:
   ```bash
   npm run dev
   ```

---

## 4. Running Test Suites

### Backend Unit & Regression Tests (Pytest)
```bash
cd backend
python -m pytest tests/test_sri_and_regex.py tests/test_webgl_and_mime.py tests/test_markers_v2.py -v
```

### Frontend Type Safety (TypeScript)
```bash
cd web
npx tsc --noEmit
```

### Full System E2E Suite
```bash
python scripts/verify_suite.py
```
