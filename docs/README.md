# STAGE System Documentation

Welcome to the official developer and architecture documentation for **STAGE**, a premium visual quality assurance and collaborative bug-tracking platform. STAGE integrates real-time visual overlays with dynamic sandboxed proxy runners, screenshot orchestration, and live WebSocket synchronization.

---

## Project Identity & High-Level Purpose
STAGE serves as a **Visual QA OS**. It allows developers, product managers, and reviewers to interact with a target web application inside a sandboxed iframe overlay, drop precise feedback pins (markers) on DOM/Canvas/WebGL elements, record style modifications (DOM edits), generate automated AI reports, and share secure review sessions with external stakeholders.

---

## Technical Stack
- **Frontend Layer**: Next.js 16 (App Router), React 19, TypeScript, Zustand (State Management), Framer Motion (Animations), Tailwind CSS, Lucide icons.
- **Backend Layer**: FastAPI (Python 3), SQLAlchemy (ORM), Uvicorn, PostgreSQL (Neon DB in production, SQLite in local development), Alembic (Migrations).
- **Realtime Layer**: WebSockets (FastAPI), Redis Pub/Sub (cross-instance channel communication for horizontal scaling).
- **Proxy Layer**: Custom proxy fallback middleware with HTML rewriting, cookie management, asset resolvers, and SSRF/domain-scoping filters.

---

## Quick Navigation by Role

### 📋 Product Managers
- [System Overview](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/system-overview.md): High-level capabilities, user roles, capabilities, and system boundaries.
- [Workflows](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/workflows.md): Step-by-step user-facing behavior and backend events.
- [Business Logic & Rules](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/logic-and-rules.md): Permission matrices, Pydantic validation boundaries, and state machines.

### 🎨 Frontend Engineers
- [Frontend Architecture](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/frontend-architecture.md): Next.js app routes, Zustand state stores, layout clients, and the interactive `<AuditSurface>` overlay.
- [Aesthetics & Themes](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/logic-and-rules.md): Design tokens and UI themes.
- [Testing & Quality](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/testing-and-quality.md): Vitest framework, local test suites, and mock contexts.

### ⚙️ Backend Engineers
- [Backend Architecture](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/backend-architecture.md): Routers, services, repositories, database connection pooling, and the realtime Redis Pub/Sub framework.
- [Data Model & Entities](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/data-model.md): Database tables, constraints, fields, and migrations.
- [API Reference](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/api-reference.md): Fully audited inventory of endpoints, request bodies, query params, schemas, and error responses.

### 🚀 DevOps & QA Engineers
- [Development Guide](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/development-guide.md): How to spin up backend/frontend services locally, seed database, and execute tests.
- [Deployment & Operations](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/deployment-and-operations.md): Build pipelines, hosting environments (Vercel, Railway), and env specifications.
- [Security & Privacy](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/security-and-privacy.md): SSRF/SSRF redirects safeguards, domain constraints, encryption keys, and API rate limiting.

### 🤖 Future AI Agents
- [AI Agent Hand-off](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/ai-agent-handoff.md): Checklist, design invariants, operational commands, and documentation requirements.

---

## Complete Documentation Index

| File | Purpose |
| --- | --- |
| [README.md](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/README.md) | Central entry point and navigation |
| [System Overview](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/system-overview.md) | High-level system structure and user boundaries |
| [System Architecture](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/architecture.md) | Deep technical architecture and Mermaid topology |
| [Directory & File Map](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/directory-and-file-map.md) | Annotated repository tree and file descriptions |
| [Frontend Architecture](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/frontend-architecture.md) | Screens, UI components, Zustand stores, layout checks |
| [Backend Architecture](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/backend-architecture.md) | Services, repositories, WebSocket loops, and proxy rewrites |
| [API Reference](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/api-reference.md) | Complete endpoints, request/response contracts, schemas |
| [Data Model](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/data-model.md) | ER diagrams, table schemas, relations, migrations |
| [Workflows](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/workflows.md) | User lifecycles (auth, project, review sessions) mapped in sequence |
| [Logic & Rules](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/logic-and-rules.md) | Business invariants, permission matrices, coordinate anchors |
| [Integrations](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/integrations.md) | External CDNs, GitHub OAuth, Neon database, Resend email |
| [Development Guide](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/development-guide.md) | Set up, run, seed, and debug commands |
| [Testing & Quality](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/testing-and-quality.md) | Vitest, Pytest, E2E playbooks, code quality gaps |
| [Deployment & Operations](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/deployment-and-operations.md) | CI/CD, build constraints, Railway configurations |
| [Security & Privacy](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/security-and-privacy.md) | Auth tokens, CORS, SSRF guards, domain-scopes |
| [Technical Debt & Risks](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/technical-debt-and-risks.md) | Codebase debt files, vulnerabilities, remediation |
| [AI Agent Hand-off](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/ai-agent-handoff.md) | Operational checklist for subsequent AI interventions |
| [ADR Index](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/adr/README.md) | Architectural Decision Records |
