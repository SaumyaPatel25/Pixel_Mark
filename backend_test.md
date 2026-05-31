Run the backend in this sequence because project creation and ownership checks depend on auth, comments depend on project state, proxy checks protect the review surface, and export/realtime only matter after data exists.

Environment and startup.

Auth and ownership.

Projects CRUD.

Public share/tester paths.

Comments and resolution.

Proxy security.

Export correctness.

Reliability, CORS, rate limits, and error handling.

Prompt 1
Use this as your first implementation prompt for the AI dev agent:

Act as a senior full-stack/backend engineer hardening a FastAPI + Supabase production system. Your task is to test the current PixelMark backend end to end, only for backend logic and API behavior, not UI styling.

System context:
The backend is a hardened FastAPI service with authenticated CRUD, Supabase-backed ownership checks, public tester comment insertion, owner-restricted Markdown export, SSRF-safe proxying, UUID-based records, and CORS fixes for localhost development. The verified endpoints include authenticated project creation/listing, public tester token resolution, public comment submission, authenticated export, and a proxy endpoint that blocks internal targets.

Your output must be structured in this exact format for every test case:

Test ID

Title

Objective

Preconditions

Step-by-step actions

Expected result

Failure meaning

Fix direction

Rules:

Do not skip edge cases.

Do not write generic QA advice.

Write executable backend-focused test steps using curl, HTTP requests, and observable DB/API outcomes.

Assume local backend runs on http://localhost:8765.

Create Phase 1 only: Environment, startup, health, dependency sanity, env variables, auth bootstrap, and database connectivity.

Phase 1 must include at least these test areas:

Backend process starts with the correct virtual environment.

Wrong Python interpreter failure case.

Missing .env variables.

Health endpoint success.

Health endpoint behavior when DB credentials are wrong.

CORS preflight from localhost:3000.

CORS preflight from localhost:3001.

CORS denial from unknown origin.

Structured JSON error shape on boot-time dependency issue.

Logs show no leaked secrets.

Also include exact expected results for each test, including status code, response shape, and what must not happen.

Prompt 2
After Phase 1 passes, use this for auth and ownership:

Continue the PixelMark backend production test plan. Create Phase 2 only: Auth, JWT enforcement, ownership boundaries, and project visibility.

Known system behavior:
Sensitive endpoints use bearer-auth style ownership enforcement, authenticated project creation/listing is implemented, and anonymous users must not create projects. Owner-only access is a core security rule.

Write at least 25 backend test cases with exact curl-style actions and expected outputs covering:

Missing Authorization header on protected routes.

Invalid bearer token.

Expired bearer token.

Valid token from user A listing user A projects.

User B denied access to user A project by ID.

Anonymous user blocked from creating a project.

Authenticated user can create project with valid payload.

Invalid project payload rejected with validation error.

Duplicate rapid create request behavior.

Project list returns only owned records.

Delete/update access control.

RLS-aligned behavior assumptions.

For every test include:
Preconditions, exact request, expected status code, expected JSON body shape, expected DB side effect, and what bug it would indicate if it fails.

Prompt 3
Then test project CRUD and lifecycle:

Create Phase 3 only: Project CRUD, schema validation, UUID integrity, and lifecycle transitions for PixelMark backend.

Known system behavior:
Projects use UUID primary keys, typed models, authenticated CRUD, and ownership-scoped responses.

Produce a comprehensive step-by-step backend test plan covering:

Valid project creation.

Empty name rejection.

Whitespace-only name rejection.

Very long name rejection or truncation policy validation.

Invalid target URL scheme rejection.

javascript: URL rejection.

Valid https://example.com acceptance.

Description optional behavior.

Project retrieval by valid owner.

Retrieval of nonexistent UUID.

Retrieval with malformed UUID.

Project deletion success.

Double deletion behavior.

Post-delete absence in list.

Timestamp presence.

UUID format validation.

Expected result section must mention exact HTTP code and exact acceptance/rejection rule.

Prompt 4
Then test public tester flows:

Create Phase 4 only: Public token resolution, tester-access safety, and share-link behavior currently supported by the backend.

Known system behavior:
Public tester token resolution exists, anonymous testers can access public resolution paths, and public/private response schemas are intentionally separated to avoid configuration leakage.

Test all of these with step-by-step API cases:

Valid public token lookup.

Invalid token lookup.

Token enumeration resistance expectations.

Public response does not leak owner-only config.

Anonymous user can resolve token.

Anonymous user still cannot create project.

Token-based project access works while owner-only endpoints remain protected.

Response schema contains only intended public fields.

For each test include expected JSON fields that must exist and fields that must not exist.

Prompt 5
Then comments and issue flow:

Create Phase 5 only: Comment creation, public feedback insertion, metadata integrity, and owner-side issue resolution in PixelMark backend.

Known system behavior:
Public testers can post comments without auth, comments include text, component reference, timestamp, page URL, tester metadata, and are stored against a project. Owners can later view and resolve them.

Write a backend-only test suite with exact request payloads and expected outcomes for:

Valid anonymous comment submission.

Missing project_id.

Invalid UUID format.

Missing text.

Whitespace-only text.

Oversized text.

Invalid x/y coordinates.

Default tester name behavior.

Page URL preservation.

Component selector preservation.

Comment persistence in owner fetch flow.

Resolve comment success.

Resolve already resolved comment.

Resolve comment by non-owner denied.

Comment insertion against nonexistent project.

Duplicate submission behavior under rapid retries.

Every test must include expected API code, persisted field expectation, and whether the bug would be validation, authorization, or data-integrity related.

Prompt 6
Then proxy hardening:

Create Phase 6 only: SSRF-safe proxy engine verification for PixelMark backend.

Known system behavior:
The proxy endpoint is a critical security component. It resolves hostnames before request, blocks internal/local/private targets, strips sensitive headers, rewrites relative links, injects overlay bridge script, uses timeouts, and prevents internal network scans. Verified behavior already includes blocking localhost targets.

Generate an aggressive backend security test plan with exact requests and expected results for:

Public URL success.

http://127.0.0.1 blocked.

http://localhost blocked.

http://169.254.169.254 blocked.

Private RFC1918 targets blocked.

Invalid scheme blocked.

Malformed URL blocked.

Timeout behavior on slow target.

Redirect handling expectations.

Header stripping checks for Set-Cookie, CSP-related leakage, and security header handling.

Relative link rewrite verification.

Overlay injection verification in returned HTML.

Broken upstream behavior mapped to safe backend error.

Expected results must include status code, safe error text, and response headers to inspect.

Prompt 7
Then export correctness:

Create Phase 7 only: Owner-restricted export, Markdown correctness, and data completeness tests for PixelMark backend.

Known system behavior:
Export is owner-restricted and Markdown generation is a core product value. The backend already validates that unauthenticated users cannot access owner-restricted export output.

Create a detailed backend test suite that covers:

Authenticated owner export success.

Unauthenticated export denied.

Non-owner export denied.

Export of empty project.

Export of project with one comment.

Export of project with multiple comments and statuses.

Export markdown contains component selector.

Export markdown contains page or context info.

Export markdown contains comment text.

Export content type correctness.

Export filename/content disposition correctness if present.

No leakage of foreign project data.

Unicode and multiline comment rendering.

Expected results must explicitly say what markdown lines or sections must appear and what must never appear.

Prompt 8
Then realtime and websocket backend:

Create Phase 8 only: WebSocket room behavior, connect/disconnect lifecycle, and realtime event consistency for PixelMark backend.

Known system behavior:
A websocket room per project exists, connection manager handles connect/disconnect/broadcast, and realtime feedback capability is part of the backend architecture.

Write backend validation tests covering:

Valid websocket connect to project room.

Invalid room/project behavior.

Multiple clients in same room.

Broadcast delivery to peers.

Disconnect cleanup.

Reconnect after disconnect.

Unauthorized cross-project visibility prevention.

Malformed message handling.

Oversized message handling policy.

Heartbeat or stale connection expectations if implemented.

For each test specify transport-level expected outcome plus in-memory room-state expectation.

Prompt 9
Then resilience and abuse:

Create Phase 9 only: Rate limits, structured errors, retries, concurrency, and production abuse-resistance for PixelMark backend.

Known system behavior:
The backend has been hardened for security and reliability, and explicit validation plus ownership controls are already important design goals.

Test all of these areas with step-by-step requests and explicit expected results:

Burst create-project attempts.

Burst comment attempts.

Burst proxy attempts.

Proper 429 behavior and Retry-After header if implemented.

Validation failures return structured 4xx instead of 500.

Unknown server errors never leak traceback to client.

Concurrent comment creation against one project.

Concurrent resolve operations on same comment.

DB transient failure behavior.

Upstream proxy failure mapping.

Idempotency expectations where applicable.

Safe log messages.

Expected result must separate client-visible behavior, DB side effects, and required logging behavior.

Prompt 10
Final signoff pass:

Create Phase 10 only: Production-grade backend release gate for PixelMark.

Summarize all previous backend test phases into a strict release checklist with these columns:

Check name

Why it matters

How to verify

Expected result

Release blocker level (Blocker, High, Medium)

Include release gates for:

Startup reliability

Auth/JWT

Ownership isolation

Project CRUD

Public tester path safety

Comment integrity

Proxy security

Export correctness

WebSocket integrity

Validation and 4xx behavior

5xx leak prevention

CORS correctness

Rate limiting

Logging and observability

DB migration consistency

Do not write explanations outside the checklist. Make it review-ready for final production approval.

Expected outcomes
If all phases pass, you should be able to claim these backend guarantees:

Unauthenticated users cannot create projects, while authenticated owners can only see their own records.

Public tester flows can submit feedback without exposing owner-only configuration.

The proxy blocks internal/local targets and returns safe output for allowed public pages.

Markdown export works only for the rightful owner and contains actionable structured issue data.

Validation failures become controlled 4xx responses instead of accidental 500s, which is necessary for production readiness.

Working style
Use the prompts one phase at a time, and do not start the next phase until the current one is fully green. That keeps the debugging surface small and matches how hardened backend systems should be validated in practice.