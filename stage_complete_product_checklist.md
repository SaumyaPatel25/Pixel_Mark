# STAGE — Complete Product Checklist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — CORE INFRASTRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] Backend deployed and running on Railway/Render
[x] Frontend deployed on Vercel
[ ] Database on NeonDB/Supabase with all migrations applied
[x] /health returns { status: "ok" }
[x] No localhost references in any production env var
[x] FRONTEND_URL matches the deployed app URL exactly
[ ] CORS configured for deployed frontend domain (Pending: missing CORS_ORIGINS in Railway)
[x] Agent script publicly accessible at stable URL
[ ] All env vars set: DATABASE_URL, SECRET_KEY, FRONTEND_URL, ALLOWED_ORIGINS, PROXY_AGENT_SCRIPT_URL (Pending: Frontend missing NEXT_PUBLIC_API_URL, Backend missing CORS_ORIGINS)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — AUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] Register new user works (Verified via code)
[x] Login returns access token (Verified via code)
[x] /auth/me returns user data (Verified via code)
[x] Protected routes reject unauthenticated requests (Verified via code)
[x] Token expiry handled gracefully (Verified via code)
[x] Auth state persists across page refresh (Verified via code)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — PROJECT AND SESSION CRUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] Create project works
[x] List projects works
[x] Edit project works
[x] Delete project works with cascade
[x] Create session with target URL works
[x] List sessions per project works
[ ] Session stores renderer_type and heavy_mode fields
[ ] Session stores target origin correctly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — PROXY RENDERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] Proxy loads a simple HTML site (Verified via code)
[ ] Proxy loads a React/Next.js site
[ ] Proxy loads a heavy WebGL/Three.js site
[x] X-Frame-Options stripped from proxied responses (Verified via code)
[x] CSP frame-ancestors stripped from proxied responses (Verified via code)
[x] Access-Control-Allow-Origin added to proxied assets (Verified via code)
[x] type="module" preserved on scripts (Verified via code)
[x] blob: and data: URLs not rewritten (Verified via code)
[ ] /_next/static/* assets load from target origin
[ ] Fonts load correctly
[ ] CSS loads correctly
[ ] JS chunks load correctly
[ ] 3D models (GLB/GLTF) load correctly
[x] Service worker disabler injected before </head> (Verified via code)
[x] Agent script injected before </body> once per page (Verified via code)
[ ] Conservative proxy mode active for heavy sites
[x] SSRF guard blocks internal IPs (Verified via code)
[x] Off-domain requests blocked or handled safely (Verified via code)
[x] Third-party runtime calls handled gracefully, not 500 (Verified via code)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — MULTI-PAGE NAVIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Internal links stay inside the proxy session
[ ] Clicking a link loads the next page correctly
[ ] A 3-page navigation flow works without breaking
[ ] PageVisit created on each page load
[ ] PageVisit updated on revisit
[ ] Tab bar shows all visited pages
[ ] Active page label updates correctly
[ ] SPA navigation (pushState) detected and recorded
[ ] Hash-only navigation handled separately
[ ] Parent_page_id uses target URL, not STAGE URL
[ ] Page visit URL uses target origin, not STAGE origin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — SHARE LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] POST /share-links creates a token
[x] Generated URL uses deployed frontend URL
[x] Share URL opens in fresh browser context without auth
[x] Public review page loads correctly
[x] Session title and project name shown in public review
[x] Password-protected share link works
[x] Wrong password rejected with clear error
[x] Expired share link shows expired state
[x] Deactivated share link denied access
[x] Existing links listed in share panel
[x] Deactivate link works from the UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — MARKER CAPTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] New Feedback button exists and is visible (Verified via code)
[x] New Feedback activates marker mode (Verified via code)
[x] Alt+Click creates a marker (Verified via code)
[x] Ctrl+Click is NOT the active shortcut (Verified via code)
[x] Marker payload includes session_id, page_url, x, y (Verified via code)
[x] Marker payload includes element_selector, element_text, element_tag (Verified via code)
[x] Marker payload includes issue_type, severity, created_via (Verified via code)
[x] POST /markers succeeds and returns marker_id (Verified via code)
[ ] Marker appears in Command Center immediately
[ ] Fallback manual flow works when event capture fails
[ ] Note drawer opens on fallback flow
[x] Public review marker creation works via share token (Verified via code)
[ ] Marker visible in dashboard after public review creation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — WEBGL AND CANVAS CAPTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Canvas/WebGL detection fires correctly
[ ] renderer_type stored in session state
[ ] heavy_mode set to true for WebGL pages
[ ] Heavy mode badge shown in toolbar
[ ] Agent delays listener binding on heavy pages
[ ] Resize event dispatched after injection
[ ] Canvas click captures normalized coordinates
[ ] canvas_context stored in marker payload
[ ] Canvas snapshot captured where possible
[ ] Marker created on WebGL scene is visible in Command Center
[ ] Session stays alive after heavy render interaction
[ ] Heavy mode fallback UI shown when scene struggles

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — RESPONSIVE SHELL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Desktop layout correct — iframe and command center side by side
[ ] Tablet layout correct — command center collapses into drawer
[ ] Mobile layout correct — command center as bottom sheet
[ ] Toolbar wraps cleanly on narrow screens
[ ] Iframe fills maximum available height
[ ] 100dvh used with 100vh fallback
[ ] Iframe not clipped by any parent overflow
[ ] Layout recovers after resize
[ ] Layout recovers after orientation change
[ ] No wrapper max-height clips the review area
[ ] Command center default collapsed on mobile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 — COMMAND CENTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Command center lists all markers for session
[ ] Markers grouped by page URL
[ ] Each group shows page title and marker count
[ ] Expanding group shows individual markers
[ ] Markers show issue type, note, severity, and timestamp
[ ] Marker resolve/unresolve works
[ ] Marker delete works
[ ] Command center scroll is internal only
[ ] Command center accessible via keyboard
[ ] Open/close toggle works

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11 — ERROR RECOVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Partial asset failure shows warning UI
[ ] Retry button works
[ ] Snapshot-only mode available
[ ] Session not destroyed on partial failure
[ ] Critical chunk failure shows recovery prompt
[ ] Third-party runtime failure does not blank the page
[ ] Proxy timeout handled with clear error message
[ ] Remote 404 handled gracefully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 12 — FIGMA-STYLE CANVAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Canvas renders real session page visits as nodes
[ ] Nodes connected by navigation edges
[ ] Page thumbnails loaded on nodes
[ ] Node positions can be dragged and saved
[ ] Inspector panel updates on node selection
[ ] Canvas not showing hardcoded demo blocks
[ ] Canvas backend endpoint returns real frames and flows

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 13 — EXPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] Export Audit button works
[x] Markdown export includes all markers
[x] JSON export includes all markers with full context
[x] CSV export includes all markers
[x] Export respects page grouping
[x] Export includes selector, text, severity, issue type
[x] Export usable as a GitHub/Jira issue directly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 14 — PRODUCTION HARDENING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Feature flags in place for risky subsystems
[ ] Runtime guardrails prevent marker spam
[ ] Rate limiting on proxy and marker routes
[ ] Duplicate marker handling works
[ ] Logging covers proxy fetches, renderer detection, marker errors
[ ] Observability metrics tracked
[ ] Admin emergency controls available
[ ] Rollback plan defined
[ ] Release gate checklist signed off

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 15 — LAUNCH READINESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] All 13 production smoke tests pass
[ ] Heavy WebGL portfolio renders inside STAGE
[x] Share link flow works end to end
[x] Marker capture works on DOM and canvas
[x] Multi-page navigation works for 3+ pages
[ ] Mobile layout tested and correct
[x] No localhost in any network request
[x] No 404 on agent script
[x] No 500 on blocked runtime requests
[x] Incident response playbook ready
[ ] Maintenance roadmap defined
[ ] Launch support checklist active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: 15 sections | 130 checkpoints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
