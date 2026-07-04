# PixelMark System Audit & Blueprint

Welcome to the comprehensive system audit of the PixelMark repository. This directory contains a brutal, file-by-file breakdown of the current architecture, data models, broken flows, and the strategic roadmap required to bring the system to production readiness.

## Where to Start

If you are a new developer or architect joining the project, read the documents in the following order:

### 1. High-Level Architecture
- **[01 System Overview](01-system-overview.md)**: The product vision and a high-level, honest diagnosis of the codebase health.
- **[02 Repo File Map](02-repo-file-map.md)**: A directory-by-directory breakdown of the repository.

### 2. Deep Dives
- **[03 Backend Architecture](03-backend-architecture.md)**: FastAPI routing, middleware proxy logic, and database connection handling.
- **[04 Frontend Architecture](04-frontend-architecture.md)**: Next.js App Router structure and client-side queuing logic.
- **[05 Data Models and Schemas](05-data-models-and-schemas.md)**: SQLAlchemy models, relations, and data contract vulnerabilities.
- **[06 API Inventory](06-api-inventory.md)**: A comprehensive map of all REST endpoints.
- **[07 Realtime and Sync](07-realtime-and-sync.md)**: The WebSocket collaboration engine.

### 3. Critical Flows
- **[08 Auth and Session Flow](08-auth-and-session-flow.md)**: Developer login paradigms vs external reviewer flows.
- **[09 Share Link and Reviewer Flow](09-share-link-and-reviewer-flow.md)**: Public access links for client QA.
- **[10 Canvas Marker Coordinate Model](10-canvas-marker-coordinate-model.md)**: The core math behind pinning feedback to a target website.

### 4. Gaps and Strategy
- **[11 Feature Status Matrix](11-feature-status-matrix.md)**: What works, what's broken, and what is just a UI shell.
- **[12 Broken, Missing, and Hardening Needs](12-broken-missing-hardening.md)**: The most critical bugs impacting production today.
- **[13 Cross-Check: Expected vs. Actual](13-crosscheck-expected-vs-actual.md)**: Anti-patterns that must be excised from the codebase.
- **[16 Test Plan and Gap Analysis](16-test-plan-and-gap-analysis.md)**: Missing E2E and unit test coverage.
- **[17 Open Questions and Risks](17-open-questions-and-risks.md)**: Major existential risks to the current proxy-based architecture.

### 5. Operations
- **[14 Runbook: Local Dev & Production](14-runbook-local-dev-and-prod.md)**: How to compile, boot, and diagnose the stack.
- **[15 Recommended Repair Order](15-recommended-repair-order.md)**: The strict, phased roadmap for refactoring and stabilizing the product.

## Automated Inventory
- **[system_inventory.json](system_inventory.json)**: A machine-readable mapping of the current services, routes, and models.
