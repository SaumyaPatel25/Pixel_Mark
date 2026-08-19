# STAGE System Documentation Portal

Welcome to the central developer, architecture, and operational documentation hub for **STAGE**, the visual quality assurance and collaborative review platform.

---

## 🗺️ Documentation Architecture

```text
docs/
├── README.md                           # Documentation Portal (this file)
├── architecture/                       # System, backend, frontend, proxy, and performance architecture
│   ├── system-overview.md             # High-level product identity & component topology
│   ├── system-architecture.md         # Detailed Mermaid architectural diagrams & data flow
│   ├── backend-architecture.md        # FastAPI, dependency injection, connection pools & models
│   ├── frontend-architecture.md       # Next.js 16 App Router, Zustand stores & AuditSurface
│   ├── proxy-engine.md                # HTML rewriter, SRI stripping, WebGL & RSC streaming
│   ├── performance-optimizations.md   # Sub-200ms latency overhaul & empirical benchmarks
│   ├── data-model.md                  # Database entities, indexes, relationships & migrations
│   ├── realtime-sync.md               # WebSocket collaboration engine & event routing
│   ├── directory-map.md               # Full annotated repository tree
│   ├── integrations.md                # Neon, GitHub OAuth, Firebase & PostHog
│   └── tech-stack.md                  # Complete technical stack specifications
├── api/                               # REST & WebSocket protocol specifications
│   ├── rest-api-reference.md          # Comprehensive REST endpoint inventory & schemas
│   └── websocket-protocol.md          # WebSocket message frame formats & lifecycle
├── guides/                            # Developer guides & operational runbooks
│   ├── development-guide.md           # Local setup, database seeding & testing workflow
│   ├── deployment-and-operations.md   # Production deployment (Vercel + Render + Neon)
│   ├── security-and-ssrf.md           # SSRF defense, domain scoping & auth security
│   ├── incident-playbook.md           # Production incident triage & remediation
│   ├── workflows.md                   # End-to-end user & system lifecycles
│   ├── business-logic-and-rules.md    # Validation matrices & state machine invariants
│   └── ai-agent-handoff.md            # AI agent instructions & architectural invariants
├── qa/                                # Quality assurance, checklists & testing matrices
│   ├── testing-strategy.md            # Pytest & Vitest testing framework & methodology
│   ├── production-smoke-checklist.md  # Production release verification checklist
│   ├── qa-matrix.md                   # Feature status & regression test matrix
│   └── technical-debt-and-risks.md    # Technical debt log & risk assessment
├── adr/                               # Architecture Decision Records
│   ├── 001-onboarding-tour-auto-start.md
│   └── 002-scroll-lag-mitigation.md
└── archive/                           # Historical phase specs & legacy build logs
```

---

## ⚡ Role-Based Navigation

### 📋 Product & Engineering Leads
* [System Overview](architecture/system-overview.md) — Product identity, capabilities, and system boundaries.
* [System Architecture](architecture/system-architecture.md) — High-level diagrams, subsystems, and data flows.
* [Workflows](guides/workflows.md) — End-to-end user journeys (authentication, review sessions, exports).
* [Business Logic & Rules](guides/business-logic-and-rules.md) — Permission matrices and state machine rules.

### 🎨 Frontend Engineers
* [Frontend Architecture](architecture/frontend-architecture.md) — Next.js 16 App Router, Zustand state stores, and the sandboxed `<AuditSurface>` iframe container.
* [Realtime Sync Architecture](architecture/realtime-sync.md) — Live cursor tracking, presence, and marker synchronization.
* [Testing Strategy](qa/testing-strategy.md) — Vitest unit tests and component mocks.

### ⚙️ Backend Engineers
* [Backend Architecture](architecture/backend-architecture.md) — FastAPI async architecture, connection pooling, and routers.
* [Performance Optimizations](architecture/performance-optimizations.md) — Sub-200ms latency overhaul, DNS caching, and background tasks.
* [Proxy Engine Architecture](architecture/proxy-engine.md) — HTML rewriter, SRI stripping, WebGL context capture, and RSC streaming.
* [Data Model](architecture/data-model.md) — PostgreSQL / SQLite schema, table indexes, and Alembic migrations.
* [REST API Reference](api/rest-api-reference.md) — Complete REST endpoint contracts.
* [WebSocket Protocol](api/websocket-protocol.md) — Wire-format event payloads.

### 🚀 DevOps & Security Engineers
* [Development Guide](guides/development-guide.md) — Local environment setup, database provisioning, and seeding.
* [Deployment & Operations](guides/deployment-and-operations.md) — Vercel and Render production pipelines.
* [Security & SSRF Safeguards](guides/security-and-ssrf.md) — SSRF protection, private CIDR validation, and domain scoping.
* [Incident Playbook](guides/incident-playbook.md) — Production alert troubleshooting and failover playbooks.
* [Production Smoke Checklist](qa/production-smoke-checklist.md) — Pre-release validation checklist.
