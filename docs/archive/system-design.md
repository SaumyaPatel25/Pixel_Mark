# System Design

This document details the runtime behaviors, critical execution paths, and fault-tolerance considerations within the STAGE platform.

## Runtime Behavior & The Proxy Engine

The most critical and sensitive component of STAGE is the Proxy Engine (`proxy` module). It is designed to act as an intermediary between the user's browser and arbitrary external web environments.

### The `rewrite_html` Pipeline
When a request is made for an HTML document, the backend:
1. Fetches the raw HTML.
2. Identifies if the target is a Next.js application (`__NEXT_DATA__` detection). If so, it flips the session into `conservative_render_mode` to prevent breaking React hydration.
3. Injects `<base href="...">` to ensure relative asset paths resolve to the proxy rather than failing relative to the proxy domain.
4. Injects `stage-agent.js`, the core script that enables DOM selection, mutation observation, and message relaying.
5. Injects custom overlay UI containers (for pins, markers, and floating toolbars).

### Asset Resolution Strategy
Non-HTML assets (CSS, JS, Images) trigger complex resolution rules:
- **Relative URLs**: Rewritten to route through the proxy so session cookies and domain scoping are maintained.
- **Absolute / Third-Party URLs**: Checked against a `third_party_policy` whitelist. 
- **Caching**: Non-HTML assets are aggressively cached in memory (`services/cache.py`) to reduce latency and bandwidth on subsequent loads. HTML is never cached to allow accurate page visit recording.

## Critical Flows

### Blueprint Mutation Pipeline
1. **Selection (Agent)**: The user clicks a DOM node in the iframe. `stage-agent.js` computes a precise CSS selector and XPath.
2. **Relay (postMessage)**: The agent posts `{ type: "TARGET_SELECTED", selector: "..." }` to the Next.js parent window.
3. **Drafting (Zustand)**: `blueprintStore.ts` receives the target and opens the Property Inspector.
4. **Local Preview (Agent)**: When the user tweaks a style in the Inspector, a `DOM_EDIT_PREVIEW` message is sent down to the agent, which applies the style immediately via inline CSS injection.
5. **Persistence (Backend)**: Clicking "Save" flushes pending mutations to `POST /canvas/{project_id}/edits`. The backend saves these as `BlueprintMutationModel` records.
6. **Hydration (Backend -> Agent)**: On subsequent loads, the frontend fetches the edits and injects them into the agent during initialization to reconstruct the visual state.

### Realtime Synchronization
The `realtime` backend module leverages FastAPI WebSockets backed by Redis Pub/Sub channels.
- **Session Review**: Channels scoped as `sessions:{session_id}` track active viewers and live pin placements.
- **Blueprint Presence**: Channels scoped as `canvas:presence:{project_id}` broadcast mouse cursor coordinates, active selections, and activity feed events to all connected project collaborators.

## Security Considerations

### SSRF (Server-Side Request Forgery)
The proxy accepts a URL parameter and fetches it. To prevent attackers from scanning the internal AWS/VPC network or hitting metadata endpoints (e.g., `169.254.169.254`), the backend utilizes `utils/ssrf_guard.py`.
- **`is_ssrf_safe(url)`**: Resolves the hostname to an IP address and blocks private subnets, loopbacks, and link-local addresses before making the `httpx` request.

### Cross-Site Scripting (XSS)
The proxy strips potentially harmful headers (like overly restrictive CSP) to allow the STAGE agent to function. However, the application strictly separates user-generated content (comments, publications) from the execution context. 

## Reliability & Failure Points

- **Proxy Failures**: If a target URL times out or throws a 500, the proxy catches the exception and returns a fallback proxy response (`get_failure_fallback_response`) so the UI doesn't crash entirely.
- **Database Connection Saturated**: Neon Postgres connections can easily saturate on serverless. `main.py` implements a retry backoff loop on startup to ensure stable database connections.
- **Notification Engine**: The `notification_service.py` uses fire-and-forget background tasks. If email providers (Resend) fail, it logs a `failed` state in `NotificationDeliveryAttemptModel` and allows manual/bulk retries, ensuring the main collaboration thread is never blocked.
