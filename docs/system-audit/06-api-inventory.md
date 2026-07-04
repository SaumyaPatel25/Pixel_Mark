# 06 API Inventory

This document maps the major API routes exposed by the PixelMark FastAPI backend.

## Core Routers

| Module | Base Path | Description | Status | Auth Required |
|--------|-----------|-------------|--------|---------------|
| `auth` | `/auth` | Login, registration, token generation. | Active | Varies |
| `projects` | `/projects` | CRUD operations for target websites. | Active | Yes |
| `sessions` | `/sessions` | CRUD for review sessions inside a project. | Active | Yes |
| `markers` | `/markers` | CRUD for visual feedback pins on the canvas. | Active | Yes |
| `proxy` | `/proxy` | Injects the target website inside an iframe wrapper. | Active (Fragile) | Varies |
| `websocket` | `/websocket` | Real-time marker sync connections. | Active | Token/Session |
| `share_links` | `/share-links` | Generates tokens for external reviewers. | Active | Yes (Creator) |
| `review` | `/review` | Public endpoints for reviewers to access sessions. | Active | Token (Share) |
| `export` | `/export` | Generates CSV, JSON, Markdown summaries. | Partial | Yes |
| `ai` | `/ai` | AI summaries and automated triage. | Shell/Stub | Yes |
| `canvas` | `/canvas` | Command center snapshot fetching. | Partial | Yes |

## Specific Route Behavior (Highlights)

### Auth (`auth_routes.py`)
- `POST /auth/register` - Creates user.
- `POST /auth/login` - Returns JWT token.
- `GET /auth/me` - Verifies token and returns user details.

### Projects (`projects.py`)
- `GET /projects/` - Lists all projects for authenticated user.
- `POST /projects/` - Creates new project.
- `DELETE /projects/{id}` - Deletes project and cascades.
- `GET /projects/{id}/analytics` - Retrieves marker stats. (Recently fixed to support `NEXT_PUBLIC_API_URL`).

### Markers (`markers.py`)
- `POST /markers/` - Receives new coordinates and payload.
- `PUT /markers/{id}` - Updates status (e.g. `draft` -> `resolved`).
- `DELETE /markers/{id}` - Soft/Hard deletes a pin.

### Proxy (`main.py` fallback)
- The fallback middleware (`@app.middleware("http")`) catches any unhandled route, extracts the `session_id` from the referer, and proxies the request to the target website, injecting the `pixelmark-agent.js` script. This is highly vulnerable to CORS and framebusting.

---
- **Confidence Level:** Medium-High (Inferred from router lists in `main.py` and typical REST patterns).
- **Evidence Source:** `backend/main.py` imports and middleware logic.
- **Next File to Read:** `07-realtime-and-sync.md`
