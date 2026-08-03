# Tech Stack

This document details the exact technologies powering STAGE as verified in the repository configuration files (`package.json`, `requirements.txt`, etc.).

## Frontend Stack
Located in `web/`.
- **Framework**: Next.js 16.2.2 utilizing the App Router pattern.
- **Library**: React 19.2.4.
- **Styling**: Tailwind CSS v4, managed via `@tailwindcss/postcss`. No utility wrapper libraries like Shadcn are heavily enforced; mostly raw Tailwind utility classes.
- **State Management**: Zustand v5 (replaces Redux/React Context).
- **Authentication SDK**: Firebase Auth (`firebase v12.16.0`).
- **Animation**: Framer Motion v12.
- **Testing**: Vitest.

## Backend Stack
Located in `backend/`.
- **Framework**: FastAPI (Python 3.10+).
- **Server**: Uvicorn.
- **Database ORM**: SQLAlchemy 2.0+ (Async).
- **Migrations**: Alembic.
- **Proxy Client**: HTTPX (Asynchronous HTTP requests).
- **WebSockets**: FastAPI native WebSockets, synchronized across workers using Redis Pub/Sub.

## Infrastructure & Services
- **Database**: PostgreSQL, hosted on Neon (Serverless Postgres).
- **Billing Provider**: Dodo Payments (accessed via custom `dodo_client.py`).
- **Auth Provider**: Firebase Authentication (for SSO/OAuth handling), bridging to backend canonical PostgreSQL records.
- **Email Delivery**: Standard SMTP/API integration (e.g., Resend) orchestrated via `notification_service.py`.

## Build & Deployment Tools
- **Frontend Hosting**: Vercel (configured via `vercel.json`).
- **Backend Hosting**: Railway / Render (configured via `railway.toml`, `nixpacks.toml`, `render.yaml`, and `Dockerfile`).
- **CI/CD**: Uses standard `pytest` for backend regression testing and `vitest` for frontend unit testing.
