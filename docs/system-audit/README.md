# STAGE System Audit & Architecture Guide

Welcome to the central system audit repository for STAGE. All system understanding, architecture, status, design decisions, and audit reports are consolidated in this folder (`docs/system-audit/`).

---

## 🚀 Central Audit Index

- **[00 Master System Audit](00_STAGE_MASTER_SYSTEM_AUDIT.md)**: **Master document** covering product architecture, the Audit Surface vs. Blueprint Canvas product split, frontend/backend store maps, API contracts, and complete system health.
- **[18 Phase Status & Tracking](18-status-and-phase-tracking.md)**: Current completion metrics, work log, and phase status.
- **[MASTER_AUDIT.md](MASTER_AUDIT.md)**: Historical full-length repository audit document.

---

## 📚 Deep Dive Audit Documents

### 1. High-Level Architecture & Mapping
- **[01 System Overview](01-system-overview.md)**: Product vision, proxy architecture, and health overview.
- **[02 Repo File Map](02-repo-file-map.md)**: Directory-by-directory breakdown of the repository.

### 2. Subsystem Architecture
- **[03 Backend Architecture](03-backend-architecture.md)**: FastAPI routing, proxy rewriter middleware, and database handling.
- **[04 Frontend Architecture](04-frontend-architecture.md)**: Next.js App Router structure, Zustand stores, and canvas rendering.
- **[05 Data Models and Schemas](05-data-models-and-schemas.md)**: SQLAlchemy & Pydantic models, relations, and schemas.
- **[06 API Inventory](06-api-inventory.md)**: Complete map of all REST endpoints.
- **[07 Realtime and Sync](07-realtime-and-sync.md)**: WebSocket collaboration engine.

### 3. Critical Flows
- **[08 Auth and Session Flow](08-auth-and-session-flow.md)**: Login paradigms and session isolation.
- **[09 Share Link and Reviewer Flow](09-share-link-and-reviewer-flow.md)**: Public access links for client QA.
- **[10 Canvas Marker Coordinate Model](10-canvas-marker-coordinate-model.md)**: Math behind pinning feedback to target website elements.

### 4. Quality, Testing & Gaps
- **[11 Feature Status Matrix](11-feature-status-matrix.md)**: Feature breakdown matrix across phases.
- **[12 Broken, Missing, and Hardening Needs](12-broken-missing-hardening.md)**: Hardening notes and bug tracking.
- **[13 Cross-Check: Expected vs. Actual](13-crosscheck-expected-vs-actual.md)**: Contract compliance verification.
- **[16 Test Plan and Gap Analysis](16-test-plan-and-gap-analysis.md)**: Missing E2E and unit test coverage.
- **[17 Open Questions and Risks](17-open-questions-and-risks.md)**: Architectural risks and proxy considerations.

### 5. Operations & Development
- **[14 Runbook: Local Dev & Production](14-runbook-local-dev-and-prod.md)**: Compilation, booting, and diagnostic guide.
- **[15 Recommended Repair Order](15-recommended-repair-order.md)**: Phased roadmap for refactoring and product stability.

---

## 🛠️ Automated Data
- **[system_inventory.json](system_inventory.json)**: Machine-readable service, route, and model inventory.
