# Deployment and Operations

This document covers the production hosting setups, CI/CD integrations, build configurations, and operations monitoring.

---

## 1. Hosting Platforms and Architecture
PixelMark runs on a split cloud deployment model:

```
                  ┌──────────────────────┐
                  │   DNS Entrypoint     │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
      [Vercel Edge CDN]               [Railway Containers]
            │                                 │
            ▼                                 ▼
    Next.js Web Client               FastAPI Uvicorn Nodes
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                       [Neon Postgres]                [Upstash Redis]
```

- **Frontend Application**: Hosted on **Vercel** for global Edge CDN delivery, optimized Next.js routing, and static asset streaming.
- **Backend Application**: Hosted on **Railway** inside Dockerized containers, utilizing Uvicorn for asynchronous requests execution.
- **Database Layer**: **Neon Serverless PostgreSQL** database.
- **Caching & Broker Layer**: **Upstash Serverless Redis** for Pub/Sub messaging.

---

## 2. Frontend Deployment (Vercel)
- **Framework Preset**: Next.js.
- **Root Directory**: `web/`
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Vercel Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Fully qualified domain URL of the Railway API gateway (e.g. `https://api.pixelmark.io`).
  - `NEXT_PUBLIC_WS_BASE`: WebSocket server URL (e.g. `wss://api.pixelmark.io`).
  - `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`: Product analytics variables.

---

## 3. Backend Deployment (Railway)
Railway builds the backend using either Nixpacks (via `nixpacks.toml`) or a standard Dockerfile configuration:
- **Build Provider**: Python.
- **Root Directory**: `backend/`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Railway Configuration Variables**:
  - `PORT`: Automatically assigned by Railway.
  - `DATABASE_URL`: Connection string to the production PostgreSQL/Neon DB.
  - `REDIS_URL`: Connection string to Upstash Redis for horizontal clustering.
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: GitHub OAuth app keys.
  - `RESEND_API_KEY`: Production transactional email token.
  - `METRICS_AUTH_TOKEN`: Password securing `/metrics` logs.

---

## 4. CI/CD Pipeline Flow
Deployments trigger automatically on branch updates:
1. **Source push**: Code is committed and pushed to the `main` branch.
2. **Vercel CI Hooks**:
   - Detects modifications under `/web/`.
   - Runs TypeScript compilation checks (`tsc`) and Next.js builds.
   - Deploys the build to production if successful.
3. **Railway CI Hooks**:
   - Detects modifications under `/backend/`.
   - Provisions python runtime containers, installs `requirements.txt` dependencies, and starts the uvicorn service.
   - Applies database schema migrations (`alembic upgrade head`) at startup.

---

## 5. Operations, Monitoring, and Logging
- **Container Logs**: Streamed directly to Railway's dashboards. Custom log configurations are configured in `backend/logger.py`.
- **System Metrics**: Server health check endpoints (`/metrics`) expose the following metrics:
  - Cache hit rate (`cache_hit_ratio`).
  - Active proxy fallbacks count.
  - Idle WebSocket session recycling logs.
- **Exception Monitoring**: Log alerts are configured using middleware errors wrapper.
- **Database Pooling**: SQLAlchemy connection pools (`pool_size=10`, `max_overflow=20`, `pool_recycle=1800`) prevent port exhaustion under high concurrent loads.
