# PixelMark Incident Response Playbook

## Severity Matrix

| Severity Level | Definition | Response Time | Primary Investigator |
| --- | --- | --- | --- |
| **SEV-1 (Critical)** | Core functionality broken for all/most users (e.g., cannot capture markers, cannot render sessions, site down). | < 15 mins | Platform Engineer / On-call Lead |
| **SEV-2 (High)** | Major feature broken for some users, or secondary feature broken for all users (e.g., heavy WebGL failing, proxy errors on popular sites). | < 1 hour | Backend Engineer / QA Lead |
| **SEV-3 (Moderate)** | Non-critical feature broken or degraded performance (e.g., mobile layout issues, slow render times). | Next business day | Frontend Engineer / Support |
| **SEV-4 (Low)** | Minor cosmetic issues or internal tool failures (e.g., Support Diagnostics panel glitch). | Next sprint | Triage Team |

## Investigation & Mitigation

When an incident is reported, the First Responder should capture the following before attempting mitigation (unless it's a SEV-1 requiring immediate rollback):
- **Logs:** Backend application logs (filtered by session ID or domain), Vercel serverless function logs.
- **Visuals:** Screenshots or video recordings of the failure symptom.
- **Context:** Browser/OS version, URL of the affected site, and network tab HAR file (if applicable).

### 1. Proxy Asset Failures
- **Symptom:** Target website fails to load CSS, JS, or images, leading to a broken rendering in the PixelMark canvas.
- **First Responder:** Backend Engineer
- **Capture:** Failed proxy URLs in network tab, target domain. Check backend logs for circuit breaker trips.
- **Immediate Mitigation:** 
  - If a specific domain is tripping the circuit breaker, check if it's blocking requests (e.g., bot protection).
  - Use the Admin Controls to toggle the **conservative proxy mode** feature flag (`USE_CONSERVATIVE_PROXY=True`).
- **Rollback/Disable:** Disable conservative proxy mode when the core proxy logic is patched.

### 2. Heavy WebGL Render Failures
- **Symptom:** Browser crashes, freezes, or fails to render complex 3D scenes / Canvas elements on portfolio sites.
- **First Responder:** Frontend Engineer
- **Capture:** WebGL context creation errors in browser console, memory usage metrics (if possible), GPU details.
- **Immediate Mitigation:**
  - Instruct the user to disable Heavy Mode.
  - As an admin, toggle the **heavy render mode** feature flag off globally (`ENABLE_HEAVY_MODE=False`).
- **Rollback/Disable:** Keep disabled globally if a widespread Chrome/Safari WebGL bug is suspected, until a workaround is deployed.

### 3. Marker Capture Failures
- **Symptom:** Clicking to add a marker does not save, or throws a 4xx/5xx error.
- **First Responder:** Platform Engineer
- **Capture:** POST payload for the marker creation, exact error status code (e.g., 422 Validation Error vs 500 Internal Error). Backend traceback.
- **Immediate Mitigation:**
  - If rate-limiting or spam filters are falsely triggering, adjust the `check_duplicate_marker` guardrail thresholds via env vars if exposed.
  - If a DB issue, check Neon database connection limits and health.
- **Rollback/Disable:** Rollback recent backend deployments if marker schema validation changed and broke older clients.

### 4. Share Link Failures
- **Symptom:** Users cannot generate share links, or visiting a share link results in a 404/Unauthorized error.
- **First Responder:** Backend Engineer
- **Capture:** Share link URL, session ID, user authentication state (if applicable).
- **Immediate Mitigation:**
  - Verify DB integrity for the `Session` or `Project` the share link points to.
  - Check if the Vercel edge caching is serving stale 404s. Purge cache if necessary.
- **Rollback/Disable:** Rollback if recent auth or routing changes broke public access.

### 5. Session Navigation Failures
- **Symptom:** Navigating within the proxy canvas loops infinitely or fails to update the URL.
- **First Responder:** Backend/Frontend Engineer
- **Capture:** Target URL, proxy navigation history. Backend logs for `check_navigation_loop` trips.
- **Immediate Mitigation:**
  - If the target site uses complex SPA routing that breaks the proxy, advise users to start a new session directly at the deeper URL.
  - Toggle the **partial render fallback** flag if available to bypass strict navigation syncing.
- **Rollback/Disable:** Rollback recent proxy rewriter logic if it broke standard `<a>` tag interception.

### 6. Mobile Layout Failures
- **Symptom:** Command Center obscures content on mobile, or canvas scaling is incorrect.
- **First Responder:** Frontend Engineer
- **Capture:** Device model, viewport size, screenshots of the UI overlap.
- **Immediate Mitigation:**
  - Toggle the **mobile performance mode** feature flag (`ENABLE_MOBILE_PERFORMANCE_MODE=True`) if the device is struggling to render.
  - Instruct support to provide CSS workarounds if applicable.
- **Rollback/Disable:** Fast-follow with a CSS hotfix deployment.

### 7. Command Center Failures
- **Symptom:** The main UI shell (Command Center) fails to load or crashes, making the app unusable.
- **First Responder:** Platform Engineer
- **Capture:** React error boundary stack traces, browser console errors.
- **Immediate Mitigation:**
  - If a newly released shell feature is crashing, immediately rollback the frontend deployment on Vercel.
- **Rollback/Disable:** Immediate rollback is required for Command Center crashes.

## General Feature Flag Guidelines
- **When to Disable a Flag:** If a feature flag controls a subsystem (e.g., Canvas Capture) and that subsystem is causing SEV-1 or SEV-2 incidents, disable the flag immediately via Admin Override or Environment Variable.
- **Graceful Degradation:** When a flag is off, the shell MUST degrade gracefully. (e.g., if Canvas Capture is off, hide the screenshot button; do not leave a broken button).
