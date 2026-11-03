# STAGE AI Design Copilot, Sandboxed Browser Subagent & Clean Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform STAGE Copilot into an autonomous visual design partner: inject professional UI design heuristics (WCAG contrast, 8pt spacing, modular typography), sandbox the browser subagent to the current project, add background site context analysis, undo/redo history controls, top 3 AI suggestions picker, inspiration photo attachments, "Generate Dev Fix" for markers, distinct Electric Violet AI markers (`✨`), and remove legacy Blueprint mode clutter from the project session canvas.

**Architecture:** 
1. **UI Design Skills Engine (`backend/services/ui_design_rules.py`)**: Knowledge base encoding WCAG 2.1 AA/AAA contrast ratios, modular typography scaling, 8pt spacing rhythm, modern border radii/shadows, and CRO heuristics directly into the AI copilot and site context analyzer prompts.
2. **Site Context Analyzer (`POST /api/copilot/analyze-site`)**: Ingests site fingerprint and outputs business category, aesthetic critique, and top 3 contextual design improvement suggestions.
3. **Sandboxed Proxy Agent (`stage-agent.js`)**: Extracts site fingerprint (`STAGE_EXTRACT_SITE_FINGERPRINT`), sandboxes mutations to `.stage-copilot-scoped-${projectId}`, and handles scoped ephemeral styling without leaking outside the target iframe.
4. **Clean Session Canvas (`AuditSurface.tsx`)**: Strips out legacy Blueprint mode banners and redirect buttons, keeping the session canvas 100% focused on unified visual review and Copilot.
5. **Electric Violet AI Markers (`✨`)**: Dedicated color token (`ai_copilot`), glowing neon ring, and Sparkles icon for all AI-generated pins.
6. **Canvas UI Evolution (`CanvasCopilotBar.tsx` & modals)**: Background analyzing pill, Undo/Redo stack (`Ctrl+Z`/`Ctrl+Y`), 3-Card AI Suggestions picker modal, and Inspo image attachment.

**Tech Stack:** Next.js 16 (React 19, Tailwind CSS v4, Lucide React, Zustand), Vanilla JavaScript (`stage-agent.js`), FastAPI (Python 3.11+, SQLAlchemy async, Groq Qwen/Llama API, AsyncOpenAI).

**Spec:** Approved architectural design from chat turn 2026-11-03.

## Global Constraints
- **CRITICAL**: Do NOT commit anything online (`git push`, deployment to Oracle/Vercel) until explicitly authorized. All git commits must be local only.
- Micro-DOM payloads extracted from the proxy iframe must stay bounded to `< 3KB`.
- Ephemeral live DOM mutations must never permanently alter the target website or reload the iframe.
- Zero-cost: default to free tier Omni-Route (Groq Qwen 27B / Llama 3.3 70B & Whisper Large v3 or Gemini Flash) with $0.00 platform bill.
- Fallback gracefully to user BYOK keys if present in `UserAIProviderConfig`.

---

### Task 1: UI Design Heuristics Engine & Site Context Analyzer API

**Files:**
- Create: `backend/services/ui_design_rules.py`
- Modify: `backend/services/copilot_service.py`
- Modify: `backend/routers/copilot.py`
- Test: `backend/tests/test_ui_design_service.py`

**Interfaces:**
- Consumes: Site fingerprint payload `{ title: str, description: str, headings: list, dominant_colors: list, cta_buttons: list }`.
- Produces: `POST /api/copilot/analyze-site` endpoint returning `{ business_category: str, aesthetic_summary: str, dominant_colors: list, top_3_suggestions: list[dict] }`.

- [ ] **Step 1: Create `backend/services/ui_design_rules.py` with design heuristics**
  - WCAG 2.1 AA/AAA contrast rules.
  - 8pt spacing rhythm (4px, 8px, 16px, 24px, 32px, 48px).
  - Modular typography scale (12px, 14px, 16px, 20px, 24px, 32px, 48px) with optical tracking (`-0.025em` for headings).
  - Modern component polish (subtle double shadows, soft borders, rounded radii).
  - System prompt template string `UI_DESIGN_SYSTEM_PROMPT`.

- [ ] **Step 2: Implement `analyze_site_context` in `copilot_service.py`**
  - Calls free Omni-Route (Groq `qwen/qwen3.8-27b` / Gemini) with `UI_DESIGN_SYSTEM_PROMPT`.
  - Generates business category, aesthetic posture, and 3 high-impact suggestions with actionable CSS rules.
  - Includes deterministic fallback for mock testing / offline mode.

- [ ] **Step 3: Expose `POST /api/copilot/analyze-site` in `backend/routers/copilot.py`**
  - Accepts `SiteFingerprintRequest` Pydantic model.
  - Returns `SiteContextResponse` model.

- [ ] **Step 4: Run unit tests for Task 1**
  Run: `backend\venv\Scripts\pytest.exe backend/tests/test_ui_design_service.py -v`
  Expected: PASS

---

### Task 2: Sandboxed Browser Subagent & Fingerprint Extraction in `stage-agent.js`

**Files:**
- Modify: `backend/static/stage-agent.js`
- Test: `backend/tests/test_stage_agent_sandbox.js`

**Interfaces:**
- Consumes: `STAGE_REQUEST_SITE_FINGERPRINT`, `STAGE_APPLY_EPHEMERAL_MUTATION`.
- Produces: `STAGE_SITE_FINGERPRINT_RESULT` to parent with `{ title, description, headings, colors, ctas }`.

- [ ] **Step 1: Implement `extractSiteFingerprint()` in `stage-agent.js`**
  - Extracts `<title>`, `meta[name="description"]`, OpenGraph tags.
  - Extracts top 5 headings (`h1`, `h2`, `h3`).
  - Extracts primary button styles (computed `backgroundColor`, `color`, `borderRadius`, `padding`).
  - Bounds payload to `< 2KB`.

- [ ] **Step 2: Add project-scoped styling isolation**
  - Scopes ephemeral styles with `#stage-ephemeral-staging` and `.stage-copilot-scoped-${projectId}`.
  - Adds event handler for `STAGE_REQUEST_SITE_FINGERPRINT`.

- [ ] **Step 3: Run Node/JSDOM test for Task 2**
  Run: `node backend/tests/test_stage_agent_sandbox.js`
  Expected: PASS

---

### Task 3: De-clutter Canvas & Remove Legacy Blueprint Mode from Session UI

**Files:**
- Modify: `web/src/components/audit/AuditSurface.tsx`

**Interfaces:**
- Removes legacy `open-in-blueprint-btn` and `Refine page in Blueprint` banner so session canvas is clean and unified.

- [ ] **Step 1: Remove Blueprint redirect buttons and banners from `AuditSurface.tsx`**
  - Remove `open-in-blueprint-btn` around lines 2620-2640.
  - Remove `Refine page in Blueprint` banner around lines 3200-3225.
  - Clean up unused Blueprint plan imports if any.

- [ ] **Step 2: Verify TypeScript compilation**
  Run: `npm --prefix web exec -- tsc --noEmit -p web/tsconfig.json`
  Expected: 0 errors.

---

### Task 4: Electric Violet AI Marker (`✨`), Inspo Photo & "Ask AI for Dev Fix"

**Files:**
- Modify: `web/src/lib/markerColors.ts`
- Modify: `web/src/components/markers/MarkerComponents.tsx`
- Modify: `web/src/components/audit/ObservationDetails.tsx`
- Modify: `backend/routers/copilot.py` (add `POST /api/copilot/generate-dev-fix`)
- Test: `backend/tests/test_dev_fix_generator.py`

**Interfaces:**
- Color token: `ai_copilot` (`#9333ea` dot, glowing neon ring, `Sparkles` icon).
- Endpoint: `POST /api/copilot/generate-dev-fix` taking `{ marker_id, selector, comment, target_url }` and returning `{ issue_analysis, suggested_code, file_hint }`.

- [ ] **Step 1: Add `ai_copilot` theme to `markerColors.ts`**
  - `{ bg: '#f3e8ff', border: '#c084fc', text: '#581c87', dot: '#9333ea' }`.

- [ ] **Step 2: Update `MarkerPin` in `MarkerComponents.tsx`**
  - If `marker.color_token === 'ai_copilot'` or `marker.metadata?.source === 'ai_copilot'`, render pulsing violet ring and `<Sparkles className="w-4 h-4 text-white" />`.

- [ ] **Step 3: Add `POST /api/copilot/generate-dev-fix` in `backend/routers/copilot.py`**
  - Analyzes marker comments and DOM context to generate technical developer fix instructions.

- [ ] **Step 4: Update `ObservationDetails.tsx`**
  - Display purple badge `[ ✨ AI Copilot Suggestion ]` for AI markers.
  - Add button `✨ Ask AI to Generate Dev Fix` for human markers, displaying the generated technical fix.
  - Display attached inspiration images if present in `marker.metadata?.inspo_image_url`.

- [ ] **Step 5: Run tests for Task 4**
  Run: `backend\venv\Scripts\pytest.exe backend/tests/test_dev_fix_generator.py -v`
  Expected: PASS

---

### Task 5: Frontend Copilot Bar Evolution: Site DNA Badge, Undo/Redo, 3 Suggestions Modal & Inspo Upload

**Files:**
- Modify: `web/src/components/copilot/CanvasCopilotBar.tsx`
- Create: `web/src/components/copilot/CopilotSuggestionsModal.tsx`
- Create: `web/src/components/copilot/CopilotInspoUploadModal.tsx`

**Interfaces:**
- Floating Copilot Bar with:
  - Background analyzing badge (`✨ Analyzing site...` $\to$ `✨ AI Ready`).
  - Undo (`↩️`) / Redo (`↪️`) buttons and `Ctrl+Z` / `Ctrl+Shift+Z` shortcuts.
  - `💡 3 AI Suggestions` button opening `CopilotSuggestionsModal.tsx`.
  - `🖼️ Inspo Upload` button opening `CopilotInspoUploadModal.tsx`.

- [ ] **Step 1: Implement Undo/Redo history stack in `CanvasCopilotBar.tsx`**
  - Maintain `history: MutationSnapshot[]` and `historyIndex`.
  - Implement `handleUndo` and `handleRedo` sending `STAGE_APPLY_EPHEMERAL_MUTATION`.
  - Keyboard listener for `Ctrl+Z` and `Ctrl+Shift+Z` / `Ctrl+Y`.

- [ ] **Step 2: Implement Background Site Context extraction and status badge**
  - On iframe ready, send `STAGE_REQUEST_SITE_FINGERPRINT`.
  - Call `/api/copilot/analyze-site`.
  - Display status badge on bar.

- [ ] **Step 3: Create `CopilotSuggestionsModal.tsx`**
  - Displays 3 cards (CRO, Typography, Spacing).
  - "Preview" applies ephemeral CSS; "Confirm & Pin" commits Electric Violet AI marker.

- [ ] **Step 4: Create `CopilotInspoUploadModal.tsx`**
  - File picker or paste for inspiration screenshot.
  - Passes image to AI prompt and attaches base64/URL to marker.

- [ ] **Step 5: Verify web test suite and TypeScript**
  Run: `npm --prefix web run test` & `npm --prefix web exec -- tsc --noEmit -p web/tsconfig.json`
  Expected: 0 errors.

---

### Task 6: End-to-End Verification & Local Test Suite

**Files:**
- Test: `backend/tests/test_e2e_copilot_v2.py`

- [ ] **Step 1: Run comprehensive end-to-end v2 test suite**
  Run: `backend\venv\Scripts\pytest.exe backend/tests/test_e2e_copilot_v2.py -v`
  Expected: PASS

- [ ] **Step 2: Verify git status is clean and strictly local**
  Run: `git status`
  Expected: Working tree clean or only local unpushed commits. Remote origin untouched.

---
