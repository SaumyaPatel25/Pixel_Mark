# 04 Frontend Architecture

This document describes the structure and state of the STAGE frontend.

## Next.js App Router Structure
- **Framework:** Next.js (App Router, `src/app/`)
- **Route Tree Chaos:** 
  - The repository has suffered from route path renaming without proper cleanup. There are competing folders for the same logical domains:
    - `(dashboard)/` vs `projects/` vs `project/`
    - `(auth)/` vs `auth/`
  - Many of these duplicate folders are either dead, shell-only placeholders, or active conflict zones during deployments.

## App Layouts & Auth Guarding
- **Edge Middleware (`src/middleware.ts`):** 
  - Enforces route protection natively at the Edge.
  - Checks for the presence of the `stagetoken` cookie.
  - Protects: `/projects`, `/project`, `/dashboard`, `/settings`, `/sessions`.
  - Redirects authenticated users away from `/login` and `/signup` to `/projects`.
- **Client Auth:** The frontend predominantly relies on checking `localStorage.getItem('stagetoken')` manually in client components (`'use client'`).

## State & API Architecture
- **API Client (`src/lib/api.ts`):**
  - A centralized fetch wrapper used to make calls to the `NEXT_PUBLIC_API_URL` (usually the Railway backend).
  - Handles auth token injection natively.
- **Request Batching (`src/lib/apiQueue.ts`):**
  - Implements a queuing mechanism (`enqueueRead`, `enqueueWrite`) to debounce/batch API requests, likely introduced to mitigate rate-limiting or duplicate requests during React strict-mode renders.
- **Global Store (`src/store/`):**
  - Zustand is intended to be used for global state (e.g., marker data, UI toggles).

## WebSocket Subscription Model
- The frontend connects to the FastAPI websocket route (e.g., `wss://stage-production.up.railway.app/websocket/...`).
- Client-side hooks manage reconnection logic and parse incoming JSON broadcast messages to update marker positions and statuses in real-time.

## Areas of Shell-only UI
- **AI Triage/Summaries:** Completely mocked or shell UI. The backend router exists but the frontend rarely integrates deeply.
- **Exports:** The frontend UI for downloading CSV/JSON is present but historically fragile.
- **Project Settings:** Mostly visual shells without full backend CRUD wiring.

---
- **Confidence Level:** High
- **Evidence Source:** `web/src/middleware.ts` and `web/src/app` directory listing.
- **Next File to Read:** `05-data-models-and-schemas.md`
