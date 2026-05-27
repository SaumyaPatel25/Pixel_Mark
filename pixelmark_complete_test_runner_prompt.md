
# PixelMark — Complete Production Test Runner Prompt

Paste this into your IDE to generate a single end-to-end testing script.

You are a senior QA + automation engineer.

Goal:
Create a single master test file that validates every PixelMark feature built so far.
This includes backend, frontend, database, exports, share links, canvas, WebSocket, and deployment sync.

Create file: tests/test_00_complete_system.py

Requirements:
- Use pytest.
- Use module-level constants:
  RAILWAY_URL = environment variable or placeholder.
  VERCEL_URL = environment variable or placeholder.
- Use a module-level state dict to store token, project_id, session_id, marker_id, share_token.
- Cover the tests below in a clean order.
- Each test must have clear assertions and readable failure messages.
- Use httpx for REST requests.
- Use websockets for real-time checks.
- Use async tests where needed.
- Keep the file production-safe: no destructive deletes unless under a cleanup section.

Test sections to include:

A. Infrastructure
- backend health
- backend docs
- frontend root
- frontend login page
- CORS headers

B. Auth
- register user
- login user
- /auth/me
- invalid token
- no token

C. Projects
- create project
- list projects
- get project
- update project
- delete project

D. Sessions
- create session
- list sessions
- get session
- delete session

E. Markers
- create marker with full context
- list markers by session
- update status
- update priority
- delete marker
- verify context fields persist

F. Exports
- markdown export
- csv export
- json export
- empty session export

G. Share links
- create share link
- access share link without auth
- password-protected access
- invalid token
- delete share link

H. Canvas
- fetch canvas for project
- create frame
- update frame
- create flow

I. WebSocket
- connect to session socket
- broadcast created event
- broadcast updated event
- broadcast deleted event
- multiple-client sync

J. Frontend E2E
- login page loads
- register page loads
- login flow
- register flow
- dashboard loads
- create project from UI
- open canvas page
- logout flow

K. Cleanup
- delete marker
- delete session
- delete project

Rules:
- The test file should be runnable with:
  pytest tests/test_00_complete_system.py -v
- Use unique emails for test runs.
- Keep WebSocket tests isolated and timeout-protected.
- Add helper functions for requests and assertions.
- Add comments only for section headers, not reasoning.
- If Playwright is unavailable, skip frontend E2E gracefully.
- If database direct access is unavailable, skip DB-only checks gracefully.

Output should be a complete file, not a template.
