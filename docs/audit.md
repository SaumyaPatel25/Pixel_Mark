# STAGE Master Audit Report

The complete, unabridged master audit report for the STAGE repository is maintained at the root of the repository:

👉 **[View Complete Audit Report (`AUDIT.md`)](../AUDIT.md)**

---

## Quick Reference Summary

- **Product**: **STAGE** (Enterprise Collaborative Visual QA & Spatial Blueprint Operating System)
- **Status**: **100% Audited, Reorganized & Build Verified**
- **Frontend Build**: Next.js 16.2.2 Turbopack — **39 Routes Compiled, 0 Errors**
- **Backend Health**: Python 3.11 FastAPI — **All Modules Compiled Cleanly, 0 Errors**
- **Architecture**:
  - Sandboxed Reverse Proxy Engine with Universal Lazyload Hydration (`backend/utils/proxy_rewriter.py`)
  - Injected Reviewer Agent (`backend/static/stage-agent.js`)
  - Strict Boundary between Session Review (`/project/[id]`) and Blueprint Canvas (`/blueprint/[projectId]`)
  - Neon Serverless PostgreSQL with PgBouncer connection pooling (`statement_cache_size=0`)
  - Decoupled Identity Resolution (GitHub Direct OAuth + Firebase Sync)
  - Dodo Payments Entitlement Resolver (`PlanCapabilities`, 3-day grace period, 45s cache)
  - 20 Modular Zustand Stores (`web/src/store/`)
  - SSRF Defense-in-Depth Pipeline with manual redirect hop inspection

For detailed technical sections, refer to:
- [Architecture Specification](./architecture.md)
- [System Design & Runtime Behaviors](./system-design.md)
- [API Reference Directory](./api.md)
- [Database Schema & ERD](./db.md)
- [Business Logic & Technical Policies](./logic.md)
- [State Management & Client Memory](./memory.md)
- [Tech Stack & Cloud Infrastructure Directory](./tech-stack.md)
