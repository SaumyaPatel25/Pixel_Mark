# Architecture Overview

The STAGE platform is designed around a decoupled architecture separating the presentation layer, the API/proxy layer, and the persistence layer. 

## System Boundaries

1. **Frontend Client (Next.js)**
   - Responsible for rendering the user dashboard, billing UI, and the outer shell of the collaboration workspace.
   - Manages local client state (Zustand) and Firebase authentication tokens.
2. **Backend API & Proxy (FastAPI)**
   - Responsible for enforcing authorization, querying the database, broadcasting realtime events, and proxying third-party websites.
   - Houses the core business logic, including entitlement resolution and notification formatting.
3. **Target Website (External)**
   - The user's live website or staging environment that is proxied and injected with the STAGE collaboration agent.
4. **Data Persistence (PostgreSQL)**
   - The canonical source of truth for all users, projects, sessions, comments, and Blueprint mutations.

## Request & Data Flow (Proxy Injection)

The core value proposition of STAGE relies on its reverse proxy flow:

1. **Initialization**: The user creates a `Project` and a `Session` with a target URL.
2. **Iframe Mount**: The Next.js frontend mounts an `<iframe>` pointing to the backend API (`/proxy/session/{session_id}/path`).
3. **Proxy Fetch**: FastAPI receives the request, validates the session, and uses an asynchronous `httpx` client to fetch the raw HTML/assets from the target website.
4. **HTML Rewriting**: The backend intercepts the response (`rewrite_html`) and injects a script tag pointing to `stage-agent.js` (and CSS). 
5. **Streaming**: The modified HTML is returned to the iframe. 
6. **Agent Execution**: Inside the iframe, `stage-agent.js` initializes. It establishes a `postMessage` channel with the outer Next.js shell to relay DOM selections, mutations, and marker coordinates.

## Key Modules

### Frontend Modules
- `(dashboard)`: The main authenticated user area.
- `blueprint`: The complex Canvas workspace containing toolbars, property inspectors, and the live frame.
- `store`: Zustand state slices dividing domains (e.g., `blueprintStore.ts`, `authStore.ts`).

### Backend Modules
- `proxy`: Handles SSRF protection, asset resolution, domain whitelisting, and HTML rewriting.
- `routers/canvas.py`: Manages the CRUD operations for Blueprint edits, publications, and comments.
- `services/identity_resolver.py`: Maps external OAuth providers (Firebase) to canonical internal database identities.
- `realtime`: Manages WebSocket connections for multi-user presence, broadcasting cursor coordinates and activity feed events.

## Major Risks & Constraints
- **CORS & Asset Resolution**: Complex modern web applications (like React/Next.js SPA targets) often utilize absolute URLs or dynamic module imports. The proxy engine must carefully resolve relative paths and handle strict CSP headers stripped during the fetch phase.
- **SSRF (Server-Side Request Forgery)**: Because the backend proxy fetches arbitrary URLs on behalf of the user, it is critical to enforce strict SSRF guards (`is_ssrf_safe`) to prevent internal network scanning.
- **Iframe Sandboxing**: Security constraints prevent direct cross-origin DOM access. The architecture relies entirely on `postMessage` bridging between the host (Next.js) and the agent (`stage-agent.js`).
