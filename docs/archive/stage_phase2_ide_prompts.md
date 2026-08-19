
# STAGE Phase 2 — AI IDE Prompts (Step by Step)

Paste each prompt into Cursor / Windsurf / Copilot Chat / Claude Dev.
Run them in order. Each prompt is self-contained with full context.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 1 — lib/api.ts (API client)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior TypeScript full-stack engineer.

Project: STAGE — a visual QA feedback platform.
Stack: Next.js 14 (App Router), TypeScript, Zustand.
Backend base URL: http://localhost:8765 (FastAPI)
Auth: JWT Bearer token stored in localStorage as "stagetoken"

Task:
Create the file web/src/lib/api.ts

This file must:
1. Export a single `api` object with typed async methods
2. Auto-inject Authorization: Bearer <token> from localStorage on every request
3. Throw Error with the backend's `detail` field on non-ok responses
4. Cover these endpoint groups:

AUTH:
- register(email, password, name?) → POST /auth/register → { access_token }
- login(email, password) → POST /auth/login → { access_token }
- me() → GET /auth/me → { id, email, name }

PROJECTS:
- getProjects() → GET /projects/
- createProject({ name, url? }) → POST /projects/
- getProject(id) → GET /projects/:id
- deleteProject(id) → DELETE /projects/:id

SESSIONS:
- getSessions(projectId) → GET /sessions/project/:projectId
- createSession({ project_id, title? }) → POST /sessions/
- getSession(id) → GET /sessions/:id

MARKERS:
- getMarkers(sessionId) → GET /markers/session/:sessionId
- createMarker(data) → POST /markers/
- updateMarker(id, data) → PATCH /markers/:id
- deleteMarker(id) → DELETE /markers/:id

EXPORT:
- exportMarkdown(sessionId) → GET /export/session/:id/markdown → returns text string
- exportCSV(sessionId) → GET /export/session/:id/csv → returns Blob

SHARES:
- createShareLink({ session_id, can_comment }) → POST /shares/
- getShareLinks(sessionId) → GET /shares/session/:sessionId

AI:
- triageSession(sessionId) → POST /ai/triage/session/:sessionId
- summarizeSession(sessionId) → GET /ai/summary/session/:sessionId

CANVAS:
- getCanvas(projectId) → GET /canvas/project/:projectId
- createFrame(data) → POST /canvas/frames/
- updateFrame(id, data) → PATCH /canvas/frames/:id
- createFlow(data) → POST /canvas/flows/

Rules:
- Use fetch() only, no axios
- BASE_URL from process.env.NEXT_PUBLIC_API_URL or fallback to http://localhost:8765
- Export and CSV endpoints return raw text/blob, not JSON
- Fully typed with TypeScript interfaces for each return type
- No default exports, only named export: export const api = { ... }
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 2 — store/authStore.ts
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior TypeScript engineer.

Project: STAGE — Next.js 14, Zustand, JWT auth.
Dependency: api object from @/lib/api (already created)

Task:
Create web/src/store/authStore.ts

Requirements:
1. Use Zustand with the `persist` middleware
2. Persist key: "stage_auth" in localStorage
3. State shape:
   - user: { id, email, name } | null
   - token: string | null
   - isLoading: boolean

4. Actions:
   - login(email, password):
       calls api.login → saves access_token to localStorage as "stagetoken"
       calls api.me() → saves user to state
   - register(email, password, name):
       calls api.register → saves access_token to localStorage as "stagetoken"
       calls api.me() → saves user to state
   - logout():
       removes "stagetoken" from localStorage
       sets user and token to null
   - fetchMe():
       calls api.me() → sets user
       on error: calls logout()

5. All async actions must set isLoading: true before and false after

Rules:
- Use create<AuthState>()(persist(...)) pattern
- Import api from @/lib/api
- Export: export const useAuthStore = create(...)
- Add TypeScript interface AuthState above the store
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 3 — app/(auth)/login/page.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React/Next.js engineer.

Project: STAGE — Next.js 14 App Router, Tailwind CSS, dark theme.
Brand: dark background #0a0a0f, card background #111118, purple accent #7c3aed
Dependencies: useAuthStore from @/store/authStore, next/navigation, next/link

Task:
Create web/src/app/(auth)/login/page.tsx

Requirements:
1. "use client" directive
2. Centered card layout, full viewport height, dark background
3. STAGE logo/title at top of card
4. Form fields: email (type=email), password (type=password)
5. On submit:
   - call authStore.login(email, password)
   - on success: router.push("/dashboard")
   - on error: show inline error message from err.message
6. Loading state: disable button and show "Signing in..."
7. Link to /register at bottom: "No account? Create one"
8. All inputs have purple focus ring on focus

Design rules:
- Background: bg-[#0a0a0f]
- Card: bg-[#111118] border border-white/10 rounded-2xl
- Inputs: bg-white/5 border border-white/10 text-white rounded-lg
- Focus: focus:border-purple-500
- Button: bg-purple-600 hover:bg-purple-500 text-white rounded-lg
- Error box: bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg
- Labels: text-gray-400 text-sm
- Subtext: text-gray-500 text-sm
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 4 — app/(auth)/register/page.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React/Next.js engineer.

Project: STAGE — Next.js 14 App Router, Tailwind CSS, dark theme.
Brand: dark background #0a0a0f, card background #111118, purple accent #7c3aed
Dependencies: useAuthStore from @/store/authStore, next/navigation, next/link

Task:
Create web/src/app/(auth)/register/page.tsx

Requirements:
1. "use client" directive
2. Same centered card layout as login page
3. Form fields: name (optional text), email, password
4. On submit:
   - call authStore.register(email, password, name)
   - on success: router.push("/dashboard")
   - on error: show inline error
5. Loading state: disable and show "Creating..."
6. Link to /login: "Already have an account? Sign in"

Design rules: same as login page.
- Inputs same style, purple focus ring
- Same card/background pattern
- Error box same red style
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 5 — app/(dashboard)/layout.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior Next.js engineer.

Project: STAGE — Next.js 14 App Router, Tailwind CSS.
Dependencies: useAuthStore from @/store/authStore, next/navigation

Task:
Create web/src/app/(dashboard)/layout.tsx

Requirements:
1. "use client" directive
2. On mount: check localStorage for "stagetoken"
   - If missing: router.push("/login")
   - If present but no user in store: call authStore.fetchMe()
3. Render a fixed left sidebar (w-56) with:
   - STAGE brand name + tagline at top
   - Nav links:
     - /dashboard → "Dashboard"
     - /projects → "Projects" (if you add this page later)
   - Sign out button at bottom: calls authStore.logout() → router.push("/login")
4. Main content area: ml-56 with children rendered inside

Sidebar design:
- bg-[#0d0d14] border-r border-white/5
- Nav links: text-gray-400 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 text-sm
- Sign out: text-gray-600 hover:text-red-400 text-sm
- Brand: text-white font-bold text-lg + text-gray-600 text-xs tagline
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 6 — app/(dashboard)/dashboard/page.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React/Next.js engineer.

Project: STAGE — Next.js 14, Tailwind, api from @/lib/api.
Dependencies: useAuthStore, api, next/link

Task:
Create web/src/app/(dashboard)/dashboard/page.tsx

Requirements:
1. "use client" directive
2. On mount: fetch projects via api.getProjects()
3. Header: "Welcome back, {user.name}" + subtitle
4. Top-right button: "+ New Project"
   - Clicking shows an inline creation row (not a modal)
   - Row has: text input (autofocus, Enter to submit) + Create button + Cancel button
   - On create: calls api.createProject({ name }) → appends to list
5. Projects grid (3 columns on lg, 2 on md, 1 on sm)
   - Each card: Link to /projects/:id
   - Shows: project name, url if present, "Open Canvas →" link to /canvas/:id
   - Hover: border-purple-500/30
6. Empty state: centered message if no projects

Design:
- Page bg: bg-[#0a0a0f] text-white p-6
- Cards: bg-[#111118] border border-white/10 rounded-xl p-5 hover:border-purple-500/30
- New project input: bg-white/5 border border-white/10 rounded-lg text-white text-sm
- Create button: bg-purple-600 text-white rounded-lg text-sm px-4 py-2
- "Open Canvas" link: text-purple-400 hover:text-purple-300 text-xs
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 7 — store/markerStore.ts
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior TypeScript engineer.

Project: STAGE — Zustand store for markers.
Dependencies: api from @/lib/api

Task:
Create web/src/store/markerStore.ts

Types to define:
- Priority: "critical" | "high" | "medium" | "low"
- Status: "open" | "in_progress" | "resolved"
- Marker interface with all fields: id, session_id, title?, description?,
  url?, xpath?, css_selector?, inner_text?, viewport?, browser?, os?,
  scroll_position?, console_errors?, network_errors?, priority, status,
  ai_summary?, created_at

State shape:
- markers: Marker[]
- filtered: Marker[] (filtered view)
- filters: { status?: Status; priority?: Priority; browser?: string }
- isLoading: boolean

Actions:
- fetchMarkers(sessionId): loads from api.getMarkers → sets both markers and filtered
- updateMarker(id, data): calls api.updateMarker → updates both markers[] and filtered[]
- deleteMarker(id): calls api.deleteMarker → removes from both arrays
- setFilter(filters): applies filter logic to markers → sets filtered
  Filter logic: skip marker if status/priority/browser doesn't match
- clearFilters(): resets filters to {} → sets filtered = markers

Rules:
- Use Zustand create<MarkerStore>()
- NO persist middleware on this store
- Export types: Priority, Status, Marker
- Export store: useMarkerStore
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 8 — components/command-center/MarkerFilters.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React engineer.

Project: STAGE — Next.js 14, Tailwind, dark theme.
Dependencies: useMarkerStore from @/store/markerStore

Task:
Create web/src/components/command-center/MarkerFilters.tsx

Requirements:
1. "use client" directive
2. Two dropdowns:
   - Priority filter: options → all priorities / critical / high / medium / low
   - Status filter: options → all statuses / open / in_progress / resolved
3. Calling setFilter() when dropdown changes
4. "Clear filters" text button — only visible if any filter is active
5. Horizontal flex layout with gap-3, wraps on small screens

Design:
- Dropdowns: bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-2
- Focus: focus:border-purple-500
- Clear button: text-gray-500 hover:text-gray-300 text-sm
- Export named: MarkerFilters
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 9 — components/command-center/MarkerCard.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React engineer.

Project: STAGE — Next.js 14, Tailwind, dark theme.
Dependencies: Marker type and useMarkerStore from @/store/markerStore

Task:
Create web/src/components/command-center/MarkerCard.tsx

Props: { marker: Marker }

Requirements:
1. Card displays:
   - Title (or "Untitled marker" fallback)
   - Priority badge (color-coded: critical=red, high=orange, medium=yellow, low=gray)
   - Status badge (color-coded: open=blue, in_progress=purple, resolved=green)
   - Description (if present, text-xs text-gray-400)
   - Context row: browser icon + browser name, viewport dimensions, URL (truncated)
   - XPath in a code block (if present, text-purple-300 font-mono text-xs)
   - Console errors panel (if present, red-tinted bg, shows first error)
   - ai_summary (if present, italic text-gray-400 text-xs)

2. Inline editing:
   - Status dropdown → calls updateMarker(id, { status })
   - Priority dropdown → calls updateMarker(id, { priority })
   - Delete button → calls deleteMarker(id) with confirmation

3. Hover state: border lifts to purple-500/30

Badge design:
- Critical: bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs px-2 py-0.5
- High: orange equivalent
- Medium: yellow equivalent
- Low: gray equivalent
- Open: bg-blue-500/20 text-blue-400 border border-blue-500/30
- In progress: purple equivalent
- Resolved: green equivalent

Card design:
- bg-[#111118] border border-white/10 rounded-xl p-4
- hover:border-purple-500/30 transition
- All dropdowns: bg-white/5 border border-white/10 text-gray-400 text-xs rounded-lg
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 10 — app/(dashboard)/sessions/[id]/page.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React/Next.js engineer.

Project: STAGE — Next.js 14 App Router, Tailwind.
Dependencies: useMarkerStore, MarkerCard, MarkerFilters, api from @/lib/api

Task:
Create web/src/app/(dashboard)/sessions/[id]/page.tsx

Requirements:
1. "use client" directive
2. On mount: fetchMarkers(id) + api.getSession(id)
3. Header section:
   - Session title (from api.getSession)
   - Top-right buttons:
     - "Export Markdown" → calls api.exportMarkdown → triggers .md download
     - "Export CSV" → calls api.exportCSV → triggers .csv blob download
     - "AI Triage" → calls api.triageSession → shows loading state
     - "AI Summary" → calls api.summarizeSession → renders summary in expandable panel

4. Stats row (4 cards):
   - Total markers
   - Critical count (red)
   - Open count (blue)
   - Resolved count (green)

5. Toolbar: MarkerFilters on left + view toggle (Grid / List) on right
   View toggle: two small buttons, active one has bg-purple-600

6. Marker grid (grid on default, stack on list view):
   - Renders filtered markers from markerStore as MarkerCard components
   - Empty state if filtered is empty
   - Loading skeleton (3 placeholder cards) while isLoading

7. AI Summary panel (shows after AI Summary button clicked):
   - Shows: what_we_found bullets, what_to_fix_next bullets, client_summary paragraph
   - Dismissible with an X button
   - Soft purple border card design

Design:
- Page: bg-[#0a0a0f] text-white p-6 space-y-6
- Stat cards: bg-[#111118] border border-white/10 rounded-xl p-4
- Stat value: text-2xl font-bold, colored per type
- View toggle: bg-white/5 rounded-lg p-1 with active bg-purple-600 rounded-md
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 11 — store/canvasStore.ts
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior TypeScript engineer.

Project: STAGE — Zustand store for the canvas layer.
Dependencies: api from @/lib/api

Task:
Create web/src/store/canvasStore.ts

Types to define:
- CanvasFrame: { id, project_id, session_id?, title, position_x, position_y,
  width, height, snapshot_url?, markers?: any[] }
- CanvasFlow: { id, name, frame_sequence: string[] }

State:
- frames: CanvasFrame[]
- flows: CanvasFlow[]
- selectedFrame: string | null
- isLoading: boolean

Actions:
- fetchCanvas(projectId): calls api.getCanvas → sets frames and flows
- updateFramePosition(id, x, y):
    immediately updates position in local state (no API call — optimistic update for smooth drag)
- persistFramePosition(id, x, y):
    calls api.updateFrame(id, { position_x: x, position_y: y })
    (called on mouseup after drag ends)
- setSelectedFrame(id): sets selectedFrame
- addFrame(frame): appends to frames array (for optimistic add)

Rules:
- No persist middleware
- Export types: CanvasFrame, CanvasFlow
- Export store: useCanvasStore
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 12 — components/canvas/CanvasFrame.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React engineer building a Figma-like canvas.

Project: STAGE — Next.js 14, Tailwind, Zustand.
Dependencies: CanvasFrame type and useCanvasStore from @/store/canvasStore

Task:
Create web/src/components/canvas/CanvasFrame.tsx

Props: { frame: CanvasFrame; zoom: number }

Requirements:
1. Frame renders as an absolutely positioned div at (position_x, position_y)
2. DRAG behavior:
   - onMouseDown on the frame:
     - record starting mouse position and frame position
     - add mousemove + mouseup listeners to window
   - onMouseMove:
     - calculate dx, dy from start position (divide by zoom to account for scale)
     - call updateFramePosition(frame.id, newX, newY) — live update
   - onMouseUp:
     - call persistFramePosition(frame.id, finalX, finalY)
     - remove listeners
3. Frame structure:
   - Header bar: frame title + marker count badge
   - Body: snapshot_url → render <img> with object-cover | no snapshot → placeholder
   - Marker dots overlay: render colored dots for each marker
     (critical=red, high=orange, medium=yellow, low=gray)
   - Selected state: purple border + glow shadow
4. Click on frame (not drag): calls setSelectedFrame(frame.id)
5. Prevent text selection during drag with select-none

Dot colors:
- critical: bg-red-500
- high: bg-orange-500
- medium: bg-yellow-500
- low: bg-gray-500

Design:
- Frame: rounded-xl border, default border-white/10, selected border-purple-500
- Header: bg-[#111118] rounded-t-xl px-4 py-2.5 border-b border-white/5
- Body: bg-[#0d0d14] rounded-b-xl overflow-hidden
- cursor: move
- Width default: 320px, height default: 200px
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 13 — components/canvas/Canvas.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior React engineer building a Figma-like infinite canvas.

Project: STAGE — Next.js 14, Tailwind, Zustand.
Dependencies: useCanvasStore, CanvasFrame component

Task:
Create web/src/components/canvas/Canvas.tsx

Props: { projectId: string }

Requirements:

1. INITIALIZATION:
   - On mount: fetchCanvas(projectId)

2. PAN behavior:
   - Track isPanning ref (true when mousedown on canvas background, false on mouseup)
   - On mousemove while panning: update pan state {x, y} by delta
   - Cursor: grab when idle, grabbing while panning

3. ZOOM behavior:
   - Listen to wheel event on canvas div (passive: false, call preventDefault)
   - deltaY > 0 → multiply zoom by 0.9
   - deltaY < 0 → multiply zoom by 1.1
   - Clamp zoom between 0.3 and 2.5

4. CANVAS SURFACE:
   - Outer div: full width/height, overflow hidden, bg-[#0a0a0f], cursor grab
   - Dot grid background using CSS radial-gradient:
     backgroundImage: radial-gradient(circle, #ffffff08 1px, transparent 1px)
     backgroundSize: (30 * zoom)px (30 * zoom)px
     backgroundPosition: {pan.x}px {pan.y}px
   - Inner transform div: translate(pan.x, pan.y) scale(zoom), transformOrigin 0 0
   - Render CanvasFrame for each frame in store

5. CONTROLS (top-right overlay):
   - Zoom out button (−)
   - Zoom percentage display
   - Zoom in button (+)
   - Reset button: sets zoom=1, pan={x:0,y:0}
   All in a small dark pill: bg-[#111118] border border-white/10 rounded-lg

6. FLOWS LEGEND (top-left overlay, only if flows.length > 0):
   - Shows flow name + frame count
   - Purple dot per flow

7. EMPTY STATE (centered, pointer-events-none):
   - "Canvas is empty" with subtext

Rules:
- All pan/zoom listeners added via useEffect with proper cleanup
- Wheel listener must use { passive: false }
- isPanning tracked via useRef not useState (avoids re-renders)
- CanvasFrame receives zoom prop so it can compensate in drag calculations
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 14 — app/(dashboard)/canvas/[projectId]/page.tsx
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior Next.js engineer.

Project: STAGE — Next.js 14 App Router, Tailwind.
Dependencies: Canvas component from @/components/canvas/Canvas, next/link, next/navigation

Task:
Create web/src/app/(dashboard)/canvas/[projectId]/page.tsx

Requirements:
1. "use client" directive
2. Read projectId from useParams()
3. Layout: full screen height (h-screen), flex column, no scrollbars
4. Top bar (h-12, shrinks):
   - Left: "← Dashboard" link back to /dashboard
   - Separator |
   - "Canvas" label
   - Right: small hint text "Scroll to zoom · Drag to pan · Click frame to select"
5. Canvas component fills remaining height (flex-1 overflow-hidden)
6. Page has NO padding/margin on the canvas area

Topbar design:
- bg-[#0a0a0f] border-b border-white/10
- "← Dashboard": text-gray-500 hover:text-white text-sm
- "Canvas": text-white text-sm font-medium
- Hint text: text-gray-600 text-xs
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 15 — .env.local + package installs
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a DevOps / setup engineer.

Project: STAGE — Next.js 14 frontend.

Task:
1. Create web/.env.local with:
   NEXT_PUBLIC_API_URL=http://localhost:8765

2. Check web/package.json for missing dependencies and install:
   npm install zustand
   (zustand is the only new dependency needed)

3. Verify tailwind.config.ts includes content paths for:
   ./src/app/**/*.{ts,tsx}
   ./src/components/**/*.{ts,tsx}

4. Verify tsconfig.json has:
   "@/*": ["./src/*"]
   in compilerOptions.paths

5. Run: npm run dev
   Expected: Next.js starts on http://localhost:3001 (or 3000)
   Expected: No TypeScript errors on the new files

6. Test checklist:
   ✓ /login renders without errors
   ✓ /register renders without errors
   ✓ Register → redirects to /dashboard
   ✓ /dashboard shows empty projects grid
   ✓ Create project → card appears
   ✓ /canvas/:id renders the infinite canvas
   ✓ Scroll on canvas → zoom works
   ✓ Drag canvas background → pan works
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 16 — BONUS: WebSocket real-time sync
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior TypeScript engineer.

Project: STAGE — Next.js 14, Zustand.
Backend WebSocket: ws://localhost:8765/ws/session/{session_id}

Task:
Create web/src/lib/useSessionSocket.ts

This is a custom React hook that:
1. Accepts sessionId: string as parameter
2. On mount: connects to ws://localhost:8765/ws/session/{sessionId}
3. On message received:
   - Parse JSON
   - If type === "marker_created": append to markerStore.markers
   - If type === "marker_updated": update matching marker in markerStore
   - If type === "marker_deleted": remove from markerStore
4. On unmount: close WebSocket connection
5. Returns: { sendMessage(data: object): void, isConnected: boolean }

Also update sessions/[id]/page.tsx to:
- Call useSessionSocket(id) at the top of the component
- This enables live updates when another user adds/updates a marker

Rules:
- Use useRef for WebSocket instance (not useState)
- Handle reconnection: if socket closes unexpectedly, reconnect after 2 seconds
- isConnected tracks WebSocket.readyState === WebSocket.OPEN
- Use useEffect with cleanup
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 2 COMPLETE — TESTS TO RUN
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After all steps are done, run these in your browser:

TEST 1 — Auth
  ✓ /register → fill form → should land on /dashboard
  ✓ Refresh /dashboard → should stay logged in
  ✓ Click Sign out → should go to /login
  ✓ /login → fill form → should land on /dashboard

TEST 2 — Projects
  ✓ Click "+ New Project" → type name → Enter → card appears
  ✓ Hover card → purple border
  ✓ Click "Open Canvas →" → opens canvas page

TEST 3 — Session + Command Center
  ✓ Create session via POST /sessions/ in Thunder Client
  ✓ Navigate to /sessions/<id> → stats show 0
  ✓ Create marker via POST /markers/ in Thunder Client
  ✓ Refresh session page → MarkerCard appears
  ✓ Change status dropdown → card updates in real time
  ✓ Change priority dropdown → badge updates
  ✓ Click "AI Triage" → markers get priority labels
  ✓ Click "AI Summary" → summary panel appears
  ✓ Click "Export Markdown" → .md file downloads

TEST 4 — Canvas
  ✓ Navigate to /canvas/<projectId>
  ✓ Dot grid renders on dark background
  ✓ Scroll → zoom in/out works (0.3x to 2.5x)
  ✓ Drag background → canvas pans
  ✓ Zoom controls: +/−/Reset work
  ✓ If frames exist → drag frame → position saved to backend
  ✓ Click frame → purple selection border appears

TEST 5 — WebSocket (Step 16)
  ✓ Open session page in two browser tabs
  ✓ POST a new marker via Thunder Client
  ✓ Both tabs show new marker without refresh
