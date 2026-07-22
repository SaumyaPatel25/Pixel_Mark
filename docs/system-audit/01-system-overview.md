# 01 System Overview

## Product Vision
STAGE is intended to be a visual feedback and developer-collaboration platform designed for website QA/UAT. The platform aims to allow developers to create projects, spawn review sessions, and share public links with reviewers who can leave rich, coordinate-mapped visual feedback (markers) directly on target websites. 

## Current Architecture Summary
The application follows a decoupled client-server architecture:
- **Backend:** FastAPI (Python) application handling REST routes, database access (SQLAlchemy), proxy fallback logic, and WebSockets.
- **Frontend:** Next.js (TypeScript) web application utilizing the App Router.
- **Database:** PostgreSQL (Neon) with SQLAlchemy ORM.
- **Realtime:** FastAPI WebSockets coupled with a broadcast manager for live sync of markers.
- **Hosting/Deployment:** Designed for deployment on Vercel (Frontend) and Railway (Backend).

## Current Actual Maturity Level
- **Overall Status:** *Alpha / Partially Implemented.*
- The core backbone (Auth, Projects, Sessions) is wired and functioning.
- The visual marker collaboration engine exists but is historically unstable (frequent rollbacks, coordinate mapping bugs).
- Several intended features (like AI summaries, advanced exports) are completely missing or just API stubs.
- Local vs. Production parity has suffered from aggressive recent hard-resets, leading to configuration drift (e.g., CORS and hardcoded local URLs persisting into production).

## Major Subsystems
1. **Core API Engine (FastAPI):** Handles Auth, Project management, and Session tracking.
2. **Proxy/Canvas Injector:** Proxies external target websites so they can be injected with the `stage-agent.js` review script, bypassing cross-origin restrictions.
3. **Collaboration Sync (WebSockets):** Handles real-time transmission of marker coordinates and status changes between reviewers and developers.
4. **Web Dashboard (Next.js):** The primary command center for developers.

## Major Risks
- **Coordinate Drift:** Markers created inside an iframe on varying viewports do not consistently map to the developer's canvas view.
- **Auth Brittleness:** Recent commits show a turbulent struggle between NextAuth/OAuth and local mock flows, causing infinite redirects and stale cache issues.
- **Proxy/CORS Complexity:** The application relies on proxying target websites (like Google) through the backend to inject scripts, which is highly brittle against modern framebusting, CSP headers, and CORS restrictions.
- **Code Churn:** The repository has suffered from frequent hard-resets and manual `cherry-pick` rescues, leading to lost bug fixes (like the `description` attribute bug).

## Honest Diagnosis
The repository is a fast-moving, heavily prototyped MVP. While the foundation is solid (FastAPI + Next.js), the advanced functionality (iframe injection, coordinate math, WebSocket sync) is highly fragile. Much of the UI is a functional shell, but edge cases (like multi-user collaboration, robust DB migrations, and production CORS) are poorly handled and prone to breaking during deployments.

---
- **Confidence Level:** High
- **Evidence Source:** Manual inspection of `backend/main.py`, recent git logs, `web/src/app` architecture, and live error triage.
- **Next File to Read:** `02-repo-file-map.md`
