# STAGE
> The Collaboration Layer Between Clients & Developers

STAGE (formerly PixelMark) is a robust SaaS platform designed to bridge the gap between development teams and non-technical stakeholders. By acting as a reverse-proxy collaboration layer, STAGE allows teams to review, annotate, and visually edit any live website environment without installing browser extensions or adding scripts to their codebase.

## Key Features

1. **Proxy Injection Engine**: STAGE proxies target URLs and intelligently injects a collaboration iframe agent into the DOM via `rewrite_html`, enabling seamless overlay interactions.
2. **Blueprint Canvas**: A heavy DOM-editing visual workspace that allows users to pick elements, modify styles, and save project-scoped mutations that can be exported as CSS/JSON for developer handoff.
3. **Session Review**: Drop visual markers and pins on any proxy-rendered page to leave contextual feedback.
4. **Real-time Collaboration**: Multi-user presence, live cursors, and instant comment threads powered by WebSockets.
5. **Unified Notifications**: In-app feed and email digests to keep the team updated on publications, approvals, and comments.

## Architecture Summary

STAGE operates on a modern, decoupled architecture:
- **Frontend (Web)**: A Next.js 16 App Router application (React 19, Tailwind CSS v4) relying on Zustand for complex state management (Canvas, DOM Edits, Auth, etc.).
- **Backend (API + Proxy)**: A high-performance FastAPI application written in Python. It handles REST endpoints, realtime WebSocket broadcasts, and the core reverse-proxy logic using `httpx`.
- **Database**: PostgreSQL (managed via Neon) with SQLAlchemy ORM and Alembic migrations.
- **Authentication**: Firebase Authentication on the client, synced securely to backend canonical user records via JWT verification.

## Local Setup

### Prerequisites
- Node.js (v20+)
- Python (3.10+)
- PostgreSQL database
- Firebase Project credentials
- GitHub OAuth application credentials

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Configure environment variables (see .env.example)
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start the FastAPI server
uvicorn main:app --reload --port 8765
```

### 2. Frontend Setup
```bash
cd web
npm install

# Configure environment variables (see .env.example)
cp .env.example .env.local

# Start the Next.js development server
npm run dev
```

## Environment Setup Overview
Crucial variables required for local development:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For OAuth integration.
- `DATABASE_URL`: Connection string for PostgreSQL.
- `JWT_SECRET_KEY`: For backend session signing.
- `FIREBASE_*`: Frontend environment variables for Firebase initialization.

## How Frontend & Backend Fit Together
The Next.js frontend serves the dashboard, settings, and the outer shell of the Blueprint Canvas. When a user opens a project session, the frontend points an `<iframe>` to the FastAPI backend proxy route (`/proxy/session/...`). The backend fetches the target website, injects the STAGE collaboration agent (`stage-agent.js`), and streams the rewritten HTML back to the iframe. PostMessage communication bridges the Next.js outer shell with the injected iframe agent.

## Deployment Overview
- **Frontend**: Configured for seamless deployment on Vercel (`vercel.json`).
- **Backend**: Configured for deployment on Render (`render.yaml`).
- **Database**: Neon serverless Postgres.

## Deep Dive Documentation
- [Architecture](docs/architecture.md)
- [System Design](docs/system-design.md)
- [API Reference](docs/api.md)
- [Business Logic](docs/logic.md)
- [Memory & State](docs/memory.md)
- [Database Schema](docs/db.md)
- [Tech Stack](docs/tech-stack.md)