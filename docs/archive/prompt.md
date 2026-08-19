# STAGE OS: Autonomous Initialization Prompt

> **Target Audience:** Any AI-native IDE, Agentic Coder, or context-aware assistant (e.g., Antigravity, Cursor, Devin) tasked with setting up or understanding the STAGE project on a fresh machine.

---

## 🤖 AI SYSTEM INITIALIZATION DIRECTIVE

**ROLE:** Act as a Senior Fullstack Architect and DevOps Engineer.
**MISSION:** You are stepping into the "STAGE OS" repository. Your goal is to initialize the local development environment, establish the database schema, and successfully launch the application stack without human intervention (except for acquiring necessary third-party API keys).

### 🏗️ 1. Architectural Context (Read Carefully)
STAGE is an "indestructible" visual feedback platform for web auditing.
- **Frontend (`web/`)**: Next.js 16 (App Router, Turbopack), Tailwind CSS, Framer Motion, Zustand for state management.
- **Backend (`backend/`)**: FastAPI (Python 3.11+). **Crucial Design Pattern**: The backend is designed to run as a package from the repository root using relative imports (e.g., `from .config import settings`).
- **Database**: Supabase (PostgreSQL). We bypass RLS for this MVP prototype to ensure rapid iteration.
- **Core Technology**: The backend operates a **Header-Driven Proxy Engine** (`/proxy`) that neutralizes CORS/CSP and injects our isolated audit shell (`overlay.js`) into target websites, coupled with a WebSocket hub for real-time cursor/marker synchronization.

### 🛠️ 2. Execution Sequence (Step-by-Step Setup)

Execute the following steps sequentially. Use your terminal/file modification tools to inspect the environment and execute commands.

#### Step 1: Environment Verification
1. Verify `node` (v18+), `npm`, and `python` (v3.11+) are installed on the local system.
2. Confirm you are in the root directory containing `web/` and `backend/`.

#### Step 2: Backend Initialization
1. Navigate to the `backend/` directory (or run commands targeting it).
2. Create a Python virtual environment: `python -m venv venv`.
3. Activate the venv and install dependencies: `venv/Scripts/pip install -r backend/requirements.txt` (or appropriate path depending on OS).
4. Create `backend/.env`. It **must** contain:
   ```env
   SUPABASE_URL=YOUR_SUPABASE_URL
   SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
   GROQ_API_KEY=YOUR_GROQ_KEY_OPTIONAL
   ```
   *(Agent Note: Pause and ask the human user to provide these keys if you cannot find them in the environment).*

#### Step 3: Frontend Initialization
1. Navigate to the `web/` directory.
2. Install dependencies: `npm install`.
3. Create `web/.env.local` containing:
   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:8765
   ```

#### Step 4: Database Provisioning
The application relies on Supabase. Provide the user with the following SQL block and instruct them to execute it in their Supabase SQL Editor.
*(Agent Note: Do not attempt to run this via terminal unless you have a configured Supabase CLI tool available locally).*

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    target_url TEXT NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    label TEXT DEFAULT 'Shared Link',
    role TEXT CHECK (role IN ('tester', 'reviewer', 'viewer')),
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    component_selector TEXT,
    xpath TEXT,
    tag_name TEXT,
    inner_text TEXT,
    page_url TEXT,
    tester_name TEXT DEFAULT 'Anonymous',
    screenshot_url TEXT,
    x FLOAT,
    y FLOAT,
    marker_number INTEGER,
    status TEXT DEFAULT 'open',
    severity TEXT CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
    category TEXT,
    ai_summary TEXT,
    suggested_fix TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE share_links DISABLE ROW LEVEL SECURITY;
```

#### Step 5: Server Orchestration (Launch)
Once keys are verified and dependencies are installed, launch the environment from the **root** folder:

1. **Start Backend**: `uvicorn backend.main:app --reload --port 8765`
2. **Start Frontend**: Open a new terminal, `cd web`, and run `npm run dev`

### ⚠️ 3. Critical Directives for Future Modifications
- **Never touch the `public/overlay.js` selector engine** without explicit user instruction. It uses a crash-proof waterfall logic intentionally built to handle SVGs and Shadow DOM.
- **Backend Imports**: The backend relies on relative imports (e.g., `from .config import settings`). If you create new Python files in `backend/`, ensure they adhere to this package structure. Do not run `main.py` directly; always use `uvicorn backend.main:app`.
- **Validation**: `schemas.py` acts as the definitive gatekeeper. Always synchronize frontend interface types with Pydantic backend models.

---
**Agent Activation:** *If you have read this, reply with "STAGE OS Architecture Loaded. Ready to initiate setup sequence."*
