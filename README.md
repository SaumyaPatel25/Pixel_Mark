# STAGE — Collaborative Visual QA & Review Operating System

> **STAGE is the zero-installation collaborative QA and visual review operating system that enables engineering teams to inspect, annotate, and visually edit any live web application in real-time without modifying target code or installing browser extensions.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_16-336791?logo=postgresql)](https://neon.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-FF6B6B)](https://turbo.build/)

---

## 🌟 Core Technical Capabilities

- **Sandboxed Reverse-Proxy Engine**: Proxies and dynamically rewrites arbitrary target websites on-the-fly (`rewrite_html`), stripping SRI hashes, neutralizing restrictive CSP/X-Frame-Options headers, hydrating lazyload assets, and injecting a non-intrusive reviewer runtime (`stage-agent.js`).
- **Sub-200ms Perceived Turnaround**: Engineered with asynchronous connection-pooled HTTPX clients (HTTP/1.1 & HTTP/2 keep-alive), thread-safe in-memory asset caching, and background database telemetry logging.
- **Universal DOM & 3D WebGL Anchoring**: Pin review comments onto physical DOM nodes (via resilient CSS selectors and XPaths), viewport-relative coordinates, or 3D WebGL / Three.js canvas clip-spaces without GPU frame drops.
- **Blueprint Infinite Spatial Canvas**: Multi-surface architectural planning workspace featuring canvas frames, visual flow connectors, and versioned CSS mutation sets (`BlueprintDomEditSet`).
- **Synchronous Multiplayer Collaboration**: Real-time cursor movement, frame selection bounding boxes, and instant comment updates powered by FastAPI WebSockets and Redis Pub/Sub backbones.
- **Defense-in-Depth SSRF & Domain Guardrails**: Strict private CIDR IP validation, cloud metadata service blocking (AWS IMDS `169.254.169.254`), domain boundary scoping, and password-protected guest reviewer share links.

---

## 🏗️ High-Level Infrastructure Topology

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser)"]
        UI["Next.js 16 Web Application<br/>(Turbopack, React 19, Tailwind v4)"]
        AuditSurface["AuditSurface Shell<br/>(Iframe Container & Pin Overlays)"]
        BlueprintCanvas["BlueprintCanvas Shell<br/>(Infinite Spatial SVG/HTML Canvas)"]
        Zustand["Zustand State Engine<br/>(20 Modular Stores)"]
        Agent["Injected Reviewer Agent<br/>(stage-agent.js)"]
    end

    subgraph Backend["FastAPI Application Tier (Port 8765)"]
        ProxyEngine["Proxy Rewriter & Asset Resolver<br/>(HTML Rewriter, SRI/CSP Stripper)"]
        ReviewSvc["Session & Marker Subsystem<br/>(DOM Anchors & Coordinates)"]
        BlueprintSvc["Blueprint Architecture Subsystem<br/>(Frames, Flows, EditSets, AI Summarizer)"]
        RealtimeSvc["WebSocket Realtime Engine<br/>(Multiplayer Sessions & Presence)"]
    end

    subgraph Data["Persistence & Infrastructure Tier"]
        DB[(Neon PostgreSQL Serverless<br/>SQLAlchemy 2.0 Async + asyncpg)]
        Redis[(Redis Cluster / PubSub<br/>Realtime Event Bus)]
        MemoryCache["In-Memory Asset Cache<br/>(services.cache)"]
    end

    subgraph Target["External Target Tier"]
        Upstream["Upstream Customer Websites<br/>(Next.js, Webflow, Shopify, WordPress)"]
        ThirdPartyCDN["Target CDNs & Asset Hosts<br/>(Images, WebGL Models, Fonts)"]
    end

    UI --> AuditSurface
    UI --> BlueprintCanvas
    UI --> Zustand
    AuditSurface --> Agent
    AuditSurface --> ProxyEngine
    BlueprintCanvas --> RealtimeSvc
    Backend --> DB
    Backend --> Redis
    ProxyEngine --> MemoryCache
    ProxyEngine --> Upstream
    ProxyEngine --> ThirdPartyCDN
    RealtimeSvc <--> Redis
```

---

## ⚡ Quickstart Guide for Local Development

### Prerequisites
- **Node.js**: `v20.x` or higher (LTS recommended)
- **Python**: `3.11+`
- **PostgreSQL**: Neon Serverless connection string or local PostgreSQL 16 instance
- **Redis**: Local or managed Redis instance (optional; system falls back to in-memory dispatch)

### 1. Environment Configuration

Create a `.env` file in the repository root (and symlink or copy to `backend/.env`):

```bash
# Database Configuration (Neon Serverless PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@ep-sample.region.neon.tech/neondb?ssl=require

# Application Secrets
SECRET_KEY=your_development_secret_key_min_32_characters_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Service URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8765

# Redis (Optional: defaults to local in-memory fallback if unreachable)
REDIS_URL=redis://localhost:6379/0

# Third-Party Integrations (Optional for local review tests)
FIREBASE_API_KEY=your_firebase_web_api_key
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
DODO_PAYMENTS_API_KEY=your_dodo_api_key
DODO_PAYMENTS_WEBHOOK_KEY=your_dodo_webhook_signing_secret
```

Create `web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8765
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Dependency Installation

```bash
# Install backend dependencies
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cd ..

# Install frontend dependencies
cd web
npm install
cd ..
```

### 3. Running the Stack

#### Concurrent Runner (Recommended)
You can launch both the FastAPI backend and Next.js frontend concurrently using the root runner:

```bash
python run_app.py
```

#### Individual Service Runners
Alternatively, run the services in dedicated terminal sessions:

```bash
# Terminal 1: Backend API (Port 8765)
cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8765 --reload

# Terminal 2: Frontend Dashboard (Port 3000)
cd web
npm run dev
```

Visit **`http://localhost:3000`** in your browser to access the STAGE workspace.

---

## 📚 Complete Engineering Documentation Directory

Deep technical specifications and architectural references are available in the **[`docs/`](./docs)** directory:

| Document | Focus & Contents |
| :--- | :--- |
| **[`docs/architecture.md`](./docs/architecture.md)** | High-level system boundaries, end-to-end proxy request pipeline sequence, Blueprint vs Session Review architectural boundary matrix, and infrastructure topology diagram. |
| **[`docs/system-design.md`](./docs/system-design.md)** | Runtime execution critical paths (session init, pin placement, live DOM edits), WebSocket presence protocols, defense-in-depth SSRF security model, and scaling bottleneck mitigations. |
| **[`docs/api.md`](./docs/api.md)** | Comprehensive REST and WebSocket API directory grouped by domain (Auth, Projects, Sessions, Blueprint, Proxy, Markers, Billing) with request/response schemas and error codes. |
| **[`docs/db.md`](./docs/db.md)** | PostgreSQL data model specification, entity-relationship diagrams, table attributes, foreign key cascade deletion policies, and historical Supabase migration background. |
| **[`docs/logic.md`](./docs/logic.md)** | Core algorithms: Entitlement Resolver (`PlanCapabilities`, grace period, 45s cache), Canonical Identity Resolver (`resolve_canonical_user`), and Universal Lazyload Proxy Rewriter. |
| **[`docs/memory.md`](./docs/memory.md)** | Client-side memory architecture, Zustand 20-store catalog, optimistic UI vs server reconciliation patterns, and dual Undo/Redo/Reset history stacks. |
| **[`docs/tech-stack.md`](./docs/tech-stack.md)** | Exhaustive directory of all frameworks, libraries, runtime dependencies, and external cloud infrastructure services powering the platform. |

---

## 🛡️ License & Platform Identity

- **Platform Name**: **STAGE** (Legacy references noted as *PixelMark* solely where maintaining historical database schema/migration parity).
- **Organization**: Entrext Inc.
- **Copyright**: © 2026 Entrext Inc. All rights reserved.