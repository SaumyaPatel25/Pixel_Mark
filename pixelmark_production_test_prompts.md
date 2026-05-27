
# PixelMark — Production Testing IDE Prompts
# Paste each into Cursor / Windsurf / Claude Dev / Copilot Chat
# Run in order. Replace YOUR_RAILWAY_URL and YOUR_VERCEL_URL before running.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE YOU START — SET THESE TWO VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RAILWAY_URL = "https://YOUR-BACKEND.up.railway.app"
VERCEL_URL  = "https://YOUR-FRONTEND.vercel.app"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 1 — Infrastructure & Health Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer testing a deployed production SaaS backend.

Tech stack: FastAPI backend on Railway, Next.js frontend on Vercel, NeonDB (Postgres).

Task:
Create tests/test_01_infrastructure.py

Test these exactly:

1. test_backend_health
   GET {RAILWAY_URL}/health
   Assert: status 200
   Assert: response JSON has "status" == "ok"
   Assert: response JSON has "version" == "2.0.0"
   Assert: response time < 3 seconds

2. test_backend_docs_accessible
   GET {RAILWAY_URL}/docs
   Assert: status 200
   Assert: response contains "swagger" or "openapi" (case insensitive)

3. test_frontend_accessible
   GET {VERCEL_URL}
   Assert: status 200
   Assert: response contains "PixelMark" or "pixelmark" (case insensitive)

4. test_frontend_login_page
   GET {VERCEL_URL}/login
   Assert: status 200
   Assert: response contains "sign in" or "login" (case insensitive)

5. test_cors_headers_present
   OPTIONS {RAILWAY_URL}/health
   Headers: Origin: {VERCEL_URL}
   Assert: response has Access-Control-Allow-Origin header
   Assert: value is not empty

6. test_backend_response_time
   GET {RAILWAY_URL}/health (10 times in a loop)
   Assert: all responses < 5 seconds
   Print: average response time

Rules:
- Use httpx for all requests
- timeout=10 on every request
- RAILWAY_URL and VERCEL_URL at top of file as constants
- Print pass/fail clearly for each test
- pytest compatible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 2 — Auth Tests (Production)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer.

Task:
Create tests/test_02_auth_production.py

Use a unique email per test run: f"qatest_{uuid.uuid4().hex[:6]}@pixelmark.dev"

Tests:

1. test_register_new_user
   POST {RAILWAY_URL}/auth/register
   Body: {email, password: "QaTest1234!", name: "QA Tester"}
   Assert: status 200
   Assert: "access_token" in response
   Store token in module-level state dict

2. test_register_duplicate_rejected
   POST same email again
   Assert: status 400
   Assert: "detail" in response JSON

3. test_login_success
   POST {RAILWAY_URL}/auth/login
   Same credentials
   Assert: status 200
   Assert: "access_token" in response
   Update token in state dict

4. test_login_wrong_password
   POST {RAILWAY_URL}/auth/login
   Wrong password
   Assert: status 401

5. test_login_nonexistent_email
   POST {RAILWAY_URL}/auth/login
   email: "nobody@nowhere.com"
   Assert: status 401

6. test_get_me_with_token
   GET {RAILWAY_URL}/auth/me
   Header: Authorization: Bearer {token}
   Assert: status 200
   Assert: response has id, email, name
   Assert: email matches registered email

7. test_get_me_no_token
   GET {RAILWAY_URL}/auth/me
   No auth header
   Assert: status 403

8. test_get_me_invalid_token
   GET {RAILWAY_URL}/auth/me
   Header: Authorization: Bearer fake.invalid.token
   Assert: status 401

9. test_get_me_expired_token
   GET {RAILWAY_URL}/auth/me
   Header: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.fake
   Assert: status 401

Rules:
- Module-level state = {} to share token between tests
- Use uuid for unique email
- pytest compatible, clear print output

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 3 — Data Chain Tests (Project → Session → Marker)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer.

Task:
Create tests/test_03_data_chain.py

This test file creates a full data chain and verifies every step.
All tests share module-level state = {} for IDs and token.

Setup: register a fresh user at module start, store token.

Tests:

1. test_create_project
   POST /projects/ {name: "QA Project", url: "https://staging.test.com"}
   Assert: status 200, has id, name matches
   Store project_id

2. test_list_projects_contains_new
   GET /projects/
   Assert: new project_id is in the list

3. test_get_project_by_id
   GET /projects/{project_id}
   Assert: status 200, id matches

4. test_update_project_name
   PATCH /projects/{project_id} {name: "QA Project Updated"}
   Assert: status 200, name updated

5. test_create_environment
   POST /projects/{project_id}/environments {name: "staging", base_url: "https://staging.test.com"}
   Assert: status 200, has id
   Store env_id

6. test_create_session
   POST /sessions/ {project_id, title: "QA Session"}
   Assert: status 200, has id, project_id matches
   Store session_id

7. test_list_sessions_for_project
   GET /sessions/project/{project_id}
   Assert: session_id appears in list

8. test_get_session_by_id
   GET /sessions/{session_id}
   Assert: status 200

9. test_create_marker_with_full_context
   POST /markers/ with ALL fields:
   {
     session_id, title: "Button broken on mobile",
     description: "Submit button misaligned",
     url: "https://staging.test.com/checkout",
     xpath: "/html/body/div/main/button",
     css_selector: "#submit-btn",
     inner_text: "Submit",
     viewport: {width: 375, height: 812},
     browser: "Safari", os: "iOS 17",
     scroll_position: {x: 0, y: 320},
     console_errors: ["TypeError: null is not an object"],
     network_errors: [{"url": "/api/order", "status": 500}],
     priority: "high"
   }
   Assert: status 200, all fields stored correctly
   Store marker_id

10. test_marker_default_status_is_open
    GET /markers/session/{session_id}
    Find the marker, assert status == "open"

11. test_update_marker_to_in_progress
    PATCH /markers/{marker_id} {status: "in_progress"}
    Assert: status 200, marker status updated

12. test_update_marker_priority_to_critical
    PATCH /markers/{marker_id} {priority: "critical"}
    Assert: priority == "critical"

13. test_resolve_marker
    PATCH /markers/{marker_id} {status: "resolved"}
    Assert: status == "resolved"

14. test_marker_context_fields_preserved
    GET /markers/session/{session_id}
    Find marker by id
    Assert: xpath not None
    Assert: css_selector not None
    Assert: viewport == {width: 375, height: 812}
    Assert: console_errors length > 0
    Assert: network_errors length > 0
    Assert: browser == "Safari"

15. test_delete_marker
    DELETE /markers/{marker_id}
    Assert: status 200, deleted == True

16. test_marker_gone_after_delete
    GET /markers/session/{session_id}
    Assert: marker_id not in results

Rules:
- Module-level state = {} shared between all tests
- Register fresh user in conftest or at top of class
- All requests use Bearer token from state
- pytest compatible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 4 — Export Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer.

Task:
Create tests/test_04_export.py

Setup: register user, create project, session, add 3 markers with varying priority
(one critical with console errors, one high, one low minimal)

Tests:

1. test_export_markdown_status
   GET /export/session/{session_id}/markdown
   Assert: status 200
   Assert: Content-Type is text/plain or text/markdown

2. test_export_markdown_content
   Parse the markdown text
   Assert: contains "QA Report"
   Assert: contains session_id
   Assert: contains "CRITICAL" or "HIGH" (priority labels)
   Assert: contains "XPath" or "xpath"
   Assert: contains "Safari" (browser from marker)

3. test_export_markdown_all_markers_present
   Count occurrences of "## [" in markdown (each marker is a section)
   Assert: count >= 3

4. test_export_csv_status
   GET /export/session/{session_id}/csv
   Assert: status 200
   Assert: Content-Type contains "csv" or "text"

5. test_export_csv_structure
   Parse CSV text
   Assert: first line (header) contains: ID, Title, Priority, Status
   Assert: at least 3 data rows (one per marker)
   Assert: priority values are one of: critical, high, medium, low

6. test_export_json_status
   GET /export/session/{session_id}/json
   Assert: status 200
   Assert: Content-Type is application/json

7. test_export_json_structure
   Parse JSON
   Assert: is a list
   Assert: length >= 3
   Assert: each item has: id, title, priority, status, url, xpath, css_selector

8. test_export_empty_session
   Create new empty session (no markers)
   GET /export/session/{empty_session_id}/markdown
   Assert: status 200 (not 500)
   Assert: response is valid (no server error)

9. test_export_requires_auth
   GET /export/session/{session_id}/markdown with NO token
   Assert: status 401 or 403

Rules:
- Create all test data in setup (class-level fixture or setUp method)
- Use 3 markers with different priorities for content assertion tests
- pytest compatible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 5 — Share Link Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer.

Task:
Create tests/test_05_share_links.py

Setup: register user, create project, session, one marker.

Tests:

1. test_create_share_link_basic
   POST /shares/ {session_id, can_comment: true}
   Assert: status 200
   Assert: has "token" field (non-empty string)
   Assert: has "can_comment" == True
   Store token in state

2. test_create_share_link_readonly
   POST /shares/ {session_id, can_comment: false}
   Assert: can_comment == False
   Store as readonly_token

3. test_create_share_link_with_password
   POST /shares/ {session_id, can_comment: true, password: "testpass123"}
   Assert: status 200, has token
   Store as protected_token

4. test_list_share_links
   GET /shares/session/{session_id}
   Assert: status 200
   Assert: list length >= 2
   Assert: state token appears in list

5. test_access_share_link_no_auth_needed
   POST /shares/access/{token}
   Body: {} (no password, no auth header)
   Assert: status 200
   Assert: response has session_id
   Assert: session_id matches original

6. test_access_share_link_returns_session_info
   POST /shares/access/{token}
   Assert: response has can_comment field
   Assert: can_comment == True for the basic link

7. test_access_readonly_link
   POST /shares/access/{readonly_token}
   Assert: status 200
   Assert: can_comment == False

8. test_access_protected_link_wrong_password
   POST /shares/access/{protected_token}
   Body: {password: "wrongpassword"}
   Assert: status 403

9. test_access_protected_link_correct_password
   POST /shares/access/{protected_token}
   Body: {password: "testpass123"}
   Assert: status 200

10. test_access_invalid_token
    POST /shares/access/totally-fake-token-xyz123
    Assert: status 404

11. test_delete_share_link
    DELETE /shares/{share_id}
    Assert: status 200, deleted == True

12. test_deleted_link_returns_404
    POST /shares/access/{deleted_token}
    Assert: status 404

Rules:
- No auth needed for /shares/access/{token} — this is client-facing
- All other endpoints require Bearer token
- pytest compatible, state shared across tests in class

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 6 — WebSocket Tests (Production WSS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer.

Task:
Create tests/test_06_websocket.py

WebSocket URL: replace https:// with wss:// in RAILWAY_URL
Example: wss://pixelmark-backend.up.railway.app/ws/session/{session_id}

Tests (all async, use asyncio.run()):

1. test_websocket_connects
   Connect to wss://{RAILWAY_WS}/ws/session/test-session-001
   Assert: connection established without error
   Close cleanly
   Assert: no exception thrown

2. test_websocket_broadcast_two_clients
   Open ws1 and ws2 to same session URL
   ws1 sends: {"type": "marker_created", "data": {"id": "m1", "title": "Test"}}
   ws2 waits for message (timeout 5s)
   Assert: ws2 received the message
   Assert: message type == "marker_created"
   Assert: data.id == "m1"

3. test_websocket_broadcast_three_clients
   Open ws1, ws2, ws3 to same session
   ws1 sends a message
   Assert: both ws2 and ws3 receive it

4. test_websocket_different_sessions_isolated
   ws1 connects to session-AAA
   ws2 connects to session-BBB
   ws1 sends a message
   ws2 waits 2 seconds
   Assert: ws2 did NOT receive the message (sessions are isolated)

5. test_websocket_json_message_types
   Connect and send these message types one by one:
   - {"type": "marker_created", "data": {}}
   - {"type": "marker_updated", "data": {}}
   - {"type": "marker_deleted", "data": {}}
   - {"type": "ping"}
   Assert: all are broadcast without error to a second client

6. test_websocket_reconnect
   Connect ws1, disconnect it
   Reconnect same ws1 URL
   Assert: second connection works cleanly
   Send a message, assert broadcast works after reconnect

Rules:
- Use websockets library (pip install websockets)
- All async tests wrapped in asyncio.run()
- RAILWAY_WS_URL = RAILWAY_URL.replace("https://", "wss://")
- timeout=5 on all recv() calls via asyncio.wait_for
- pytest compatible (use @pytest.mark.asyncio or asyncio.run wrapper)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 7 — Frontend E2E Tests (Playwright)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior QA engineer using Playwright for E2E browser testing.

Task:
Create tests/test_07_frontend_e2e.py

Install: pip install playwright && playwright install chromium

VERCEL_URL = "https://YOUR-FRONTEND.vercel.app"

Tests:

1. test_login_page_renders
   Navigate to {VERCEL_URL}/login
   Assert: page title or h1 contains "PixelMark" or "Sign in"
   Assert: email input exists
   Assert: password input exists
   Assert: submit button exists

2. test_register_page_renders
   Navigate to {VERCEL_URL}/register
   Assert: name input exists
   Assert: email input exists
   Assert: password input exists

3. test_register_flow
   Navigate to {VERCEL_URL}/register
   Fill: name = "E2E Tester"
   Fill: email = unique email (f"e2e_{uuid4().hex[:6]}@test.com")
   Fill: password = "E2eTest1234!"
   Click submit
   Assert: URL changes to /dashboard (within 10s)
   Assert: page contains "Dashboard" or "Welcome" or "Projects"

4. test_login_flow
   Navigate to {VERCEL_URL}/login
   Fill: email from test_register_flow
   Fill: password = "E2eTest1234!"
   Click submit
   Assert: URL changes to /dashboard

5. test_dashboard_loads_after_login
   After login
   Assert: "+ New Project" button or "New Project" text exists
   Assert: no console errors of type "Error"

6. test_create_project_from_ui
   Click "+ New Project" button
   Fill project name: "E2E Test Project"
   Press Enter or click Create
   Assert: "E2E Test Project" appears on page within 5s

7. test_logout_flow
   Find and click Sign out
   Assert: URL changes to /login
   Assert: localStorage "pm_token" is removed

8. test_protected_route_redirect
   Clear localStorage (logged out state)
   Navigate to {VERCEL_URL}/dashboard
   Assert: redirected to /login

9. test_no_cors_errors_in_console
   Navigate to /login, register, go to dashboard
   Assert: no console messages containing "CORS" or "Access-Control"
   Assert: no network requests with status 0 (blocked)

10. test_canvas_page_loads
    After login and creating project
    Navigate to {VERCEL_URL}/canvas/{project_id}
    Assert: canvas element or container exists
    Assert: zoom controls visible (+ and - buttons)

Rules:
- Use playwright sync API (sync_playwright)
- headless=True for CI, headless=False for local debug
- screenshot on failure: page.screenshot(path="failure_{test_name}.png")
- timeout=10000ms on all assertions
- pytest compatible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 8 — NeonDB Verification Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior database engineer.

Task:
Create tests/test_08_database.py

This test file connects directly to NeonDB and verifies:
- All tables exist
- Data written via API actually landed in DB
- No orphaned records

Setup: read DATABASE_URL from .env file (use python-dotenv)

Tests:

1. test_all_tables_exist
   Connect to NeonDB using asyncpg
   Run: SELECT table_name FROM information_schema.tables WHERE table_schema='public'
   Assert these tables exist:
   users, organizations, org_members, projects, environments,
   sessions, markers, share_links

2. test_user_created_in_db
   After API register (use a known test email)
   Query: SELECT * FROM users WHERE email = '{test_email}'
   Assert: row exists
   Assert: hashed_password does not equal plain text password
   Assert: hashed_password starts with "$2b$" (bcrypt)

3. test_org_auto_created_with_user
   Query: SELECT o.* FROM organizations o
          JOIN org_members om ON o.id = om.org_id
          JOIN users u ON u.id = om.user_id
          WHERE u.email = '{test_email}'
   Assert: organization row exists
   Assert: role == 'owner'

4. test_marker_context_stored_as_json
   Query: SELECT viewport, console_errors, network_errors, scroll_position
          FROM markers WHERE session_id = '{session_id}'
   Assert: viewport is valid JSON with width and height keys
   Assert: console_errors is a JSON array
   Assert: network_errors is a JSON array

5. test_no_plaintext_passwords
   Query: SELECT hashed_password FROM users
   Assert: NO row where hashed_password does NOT start with "$2b$"
   (verifies bcrypt is used for all users)

6. test_cascade_delete_markers_with_session
   Create session + marker via API
   Delete session via API
   Query DB: SELECT * FROM markers WHERE session_id = '{deleted_session_id}'
   Assert: 0 rows (cascade worked)

7. test_share_token_is_unique
   Query: SELECT COUNT(*) as c, token FROM share_links GROUP BY token HAVING COUNT(*) > 1
   Assert: 0 rows (all tokens unique)

Rules:
- Use asyncpg directly: await asyncpg.connect(DATABASE_URL)
- Load DATABASE_URL from .env using python-dotenv
- Strip ?sslmode=require from URL before asyncpg connect (asyncpg handles SSL separately)
- Add ssl="require" in asyncpg.connect()
- pytest + asyncio compatible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 9 — Load & Stress Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior performance engineer.

Task:
Create tests/test_09_load.py

Tests:

1. test_concurrent_health_checks
   Send 50 concurrent GET /health requests using asyncio.gather
   Assert: all 50 return status 200
   Assert: all complete within 10 seconds total
   Print: avg, min, max response times

2. test_concurrent_registrations
   Create 10 unique users concurrently using asyncio.gather
   Assert: all 10 return access_token
   Assert: all 10 complete within 15 seconds
   Print: avg registration time

3. test_rapid_marker_creation
   Register one user, create project and session
   Create 20 markers sequentially as fast as possible
   Assert: all 20 succeed
   Assert: GET /markers/session/{id} returns 20 markers
   Print: total time, markers/second

4. test_concurrent_marker_reads
   With 20 markers in session
   Send 30 concurrent GET /markers/session/{id} requests
   Assert: all return same 20 markers
   Assert: all complete within 10 seconds

5. test_export_large_session
   With 20 markers
   GET /export/session/{id}/markdown
   Assert: status 200
   Assert: response time < 5 seconds
   Assert: all 20 markers in output

6. test_websocket_load
   Open 10 concurrent WebSocket connections to same session
   One client sends 5 messages
   Assert: all 9 other clients receive all 5 messages (45 total receives)
   Assert: completes within 15 seconds

Rules:
- Use asyncio + httpx.AsyncClient for concurrent HTTP tests
- Use websockets library for WebSocket load test
- Print timing results clearly
- pytest compatible
- Do NOT use locust or external load testing tools
- Keep concurrency reasonable (max 50 concurrent) to not abuse free tier

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 10 — Master Test Runner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior DevOps engineer.

Task:
Create tests/run_all_tests.py

This is a master runner script that:

1. Reads RAILWAY_URL and VERCEL_URL from environment or prompts user if not set
2. Runs a quick connectivity check:
   - Can reach RAILWAY_URL/health?
   - Can reach VERCEL_URL?
   - If either fails, print clear error and exit with code 1
3. Runs all test files in order using subprocess:
   - test_01_infrastructure.py
   - test_02_auth_production.py
   - test_03_data_chain.py
   - test_04_export.py
   - test_05_share_links.py
   - test_06_websocket.py
   - test_07_frontend_e2e.py  (skipped if playwright not installed)
   - test_08_database.py      (skipped if DATABASE_URL not in .env)
   - test_09_load.py          (skipped unless --load flag passed)
4. Prints a final summary table:
   ┌─────────────────────────────┬────────┬────────┐
   │ Test Suite                  │ Tests  │ Status │
   ├─────────────────────────────┼────────┼────────┤
   │ Infrastructure              │  6/6   │  PASS  │
   │ Auth                        │  9/9   │  PASS  │
   │ Data Chain                  │ 16/16  │  PASS  │
   │ Export                      │  9/9   │  PASS  │
   │ Share Links                 │ 12/12  │  PASS  │
   │ WebSocket                   │  6/6   │  PASS  │
   │ Frontend E2E                │ 10/10  │  PASS  │
   │ Database Direct             │  7/7   │  PASS  │
   └─────────────────────────────┴────────┴────────┘
5. Exits with code 0 if all pass, code 1 if any fail

Usage:
  python tests/run_all_tests.py
  python tests/run_all_tests.py --load        (includes load tests)
  python tests/run_all_tests.py --e2e-only    (only frontend E2E)
  python tests/run_all_tests.py --skip-e2e    (skips playwright tests)

Rules:
- Use subprocess.run for each test file
- Capture stdout/stderr
- Print each suite result as it finishes, not at the end
- Color output: green for PASS, red for FAIL (use colorama or ANSI codes)
- Create tests/results/ directory and save JSON report after each run
