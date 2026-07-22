# Development Guide

This guide describes how to configure, spin up, seed, and debug the STAGE Fullstack application locally.

---

## 1. Prerequisites
- **Node.js**: v18 or newer (v20+ recommended).
- **Python**: v3.10 or newer (v3.11 recommended).
- **Git**: Installed and configured.

---

## 2. Environment Variables Checklist
Create the following `.env` configurations to wire up credentials and services:

### 2.1 Backend Environment Configuration
Create a `.env` file under the `/backend/` directory:

```ini
# Server Config
PORT=8765
HOST=127.0.0.1
DEBUG=True

# Database (Neon connection URL in prod, defaults to local SQLite if omitted)
# DATABASE_URL=postgresql+asyncpg://...

# Redis Connection (Defaults to local in-memory pub/sub if omitted)
# REDIS_URL=redis://127.0.0.1:6379/0

# GitHub OAuth credentials (Optional for local dev)
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
# REDIRECT_URI=http://localhost:8765/auth/oauth/github/callback

# Resend Email Key
# RESEND_API_KEY=re_...

# AI Provider API Keys
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# System Telemetry Auth Key (Used to secure /metrics endpoint)
METRICS_AUTH_TOKEN=dev_metrics_secret
```

### 2.2 Frontend Environment Configuration
Create a `.env.local` file under the `/web/` directory:

```ini
# Backend API Base URLs
NEXT_PUBLIC_API_URL=http://localhost:8765
NEXT_PUBLIC_WS_BASE=ws://localhost:8765

# PostHog Analytics key (Optional)
# NEXT_PUBLIC_POSTHOG_KEY=phc_...
# NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 3. Step-by-Step Setup Guides

### 3.1 Step 1: Clone the Repository
```bash
git clone https://github.com/SaumyaPatel25/Pixel_Mark.git
cd Pixel_Mark
```

### 3.2 Step 2: Install Backend Dependencies
1. Navigate to backend and create a python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
3. Install required libraries:
   ```bash
   pip install -r requirements.txt
   ```
4. Return to workspace root:
   ```bash
   cd ..
   ```

### 3.3 Step 3: Install Frontend Dependencies
```bash
cd web
npm install
cd ..
```

---

## 4. Running the Application
STAGE provides a root execution helper script that automatically boots both servers and handles clean termination on exit.

### 4.1 Option A: Fullstack Dev Run (Recommended)
Run the following script from the workspace root:
```bash
# Ensure your backend venv is created before executing this
python run_app.py
```
This script will:
- Boot the Uvicorn backend server on `http://localhost:8765`.
- Pause for 2 seconds to let the port bind.
- Start the Next.js development server on `http://localhost:3000`.
- Handle `Ctrl+C` shutdowns cleanly (running Windows taskkill to reclaim ports from uvicorn reload threads).

### 4.2 Option B: Manual Server Runs
- **Run Backend Only**:
  Navigate to `/backend/` directory, activate virtual environment, and run:
  ```bash
  uvicorn main:app --reload --port 8765
  ```
- **Run Frontend Only**:
  Navigate to `/web/` directory and run:
  ```bash
  npm run dev
  ```

---

## 5. Troubleshooting Common Issues

### 5.1 Issue: `Failed to load resource: net::ERR_CONNECTION_REFUSED`
- **Cause**: The frontend is attempting to query the API at port `8765`, but the backend is not running, or is running on a different port (such as uvicorn's default `8000`).
- **Remedy**: Verify that the backend virtual environment is activated and that uvicorn is running targeting `--port 8765`. Double check `web/.env.local` to verify `NEXT_PUBLIC_API_URL` points to `http://localhost:8765`.

### 5.2 Issue: SQLite Database Lockups (`database is locked`)
- **Cause**: Simultaneous database writes during high-concurrency requests in development. SQLite does not support highly concurrent writes.
- **Remedy**: Keep write operations short. If lockups persist, clear the local DB file (`rm backend/stage.db`) and run the server to recreate a clean state.
