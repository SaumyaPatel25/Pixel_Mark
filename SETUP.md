# PixelMark Setup Guide

Follow these steps to initialize your local development environment.

## 1. Prerequisites

- **Python**: 3.11+
- **Node.js**: 20+
- **Database**: A Supabase account and project.

## 2. Definitive Database Schema

Run this in your **Supabase SQL Editor**:

```sql
-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Projects Table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    target_url TEXT NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Share Links (Access Management)
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

-- 4. Comments (Audit Feedback)
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
    status TEXT DEFAULT 'open', -- 'open' | 'resolved'
    -- AI Fields
    severity TEXT CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
    category TEXT,
    ai_summary TEXT,
    suggested_fix TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Security: Disable RLS for Prototype
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE share_links DISABLE ROW LEVEL SECURITY;
```

## 3. Configuration

1. **Backend**:
   - Navigate to `/backend`.
   - Copy `.env.example` to `.env`.
   - Fill in `SUPABASE_URL`, `SUPABASE_KEY`, and `GROQ_API_KEY` (optional).
   - Install: `pip install -r requirements.txt`.

2. **Frontend**:
   - Navigate to `/web`.
   - Copy `.env.example` to `.env.local`.
   - Set `NEXT_PUBLIC_API_BASE=http://localhost:8765`.
   - Install: `npm install`.

## 4. Launch

Run from the **root directory** (`PixelMark/`):

```bash
# Terminal 1 — Backend (Package Mode)
uvicorn backend.main:app --reload --port 8765

# Terminal 2 — Frontend
cd web
npm run dev
```

---

## ⚡ AI Developer Hand-off

If you are handing this project over to an AI agent (like Antigravity, Cursor, or Devin), simply provide them with the `prompt.md` file located in the root of this repository.

That file contains the full architectural context, schema definitions, and sequence instructions required for an AI to boot the project autonomously.
