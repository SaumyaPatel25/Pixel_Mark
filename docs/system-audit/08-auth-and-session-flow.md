# 08 Auth and Session Flow

This document maps the user authentication flows and review session lifecycles within PixelMark.

## Developer Authentication Path
- **Registration (`/signup`):** User submits credentials. Backend (`POST /auth/register`) creates a `User` record, hashes the password, and returns a JWT.
- **Login (`/login`):** User submits credentials. Backend (`POST /auth/login`) verifies hashes and returns a JWT.
- **Token Storage:**
  - The JWT is stored in two places:
    1. `localStorage.getItem('pm_token')` (used by the `api.ts` client for Authorization headers).
    2. A secure cookie (`pm_token`), which is critical for Next.js `middleware.ts` to perform edge routing guards.
- **Route Guards:** Next.js middleware forcefully redirects any unauthenticated user attempting to access `/dashboard`, `/projects`, or `/sessions` back to `/login`.

## Reviewer (Public) Authentication Path
- External clients and reviewers do *not* follow the developer auth path.
- Access is granted via **Share Links** (`/share-links`).
- A reviewer clicks a share link which injects a scoped, temporary token (or anonymous guest identity) allowing them to drop markers on a specific `Session` without creating a `User` account.
- **Missing Elements:** True guest identity tracking (e.g., prompting the reviewer for their name "Guest_592") is currently mocked or incomplete. Markers dropped by public reviewers often lack reliable author attribution.

## Session Lifecycle
1. **Creation:** A developer creates a `Session` under a `Project`. This generates a unique `session_id`.
2. **Access:** The developer clicks the session, opening the Canvas Command Center. 
3. **Proxying:** The backend `proxy_fallback_middleware` intercepts the target URL requests, rewrites them, and injects `pixelmark-agent.js`.
4. **Heartbeats:** The backend recently added `last_heartbeat_at` to the `Session` table to track if a session is actively being reviewed.

## Known Auth Bugs & Hardening Needs
1. **Dueling Auth Paradigms:** The repository history reveals a constant struggle between using a fully custom JWT local flow versus NextAuth.js / Supabase. Recent hard-resets stripped out NextAuth, leaving local auth as the dominant but fragile mechanism.
2. **Cookie vs LocalStorage Desync:** If the `pm_token` cookie expires but `localStorage` persists, the frontend UI might flicker or trap the user in an infinite redirect loop between `/login` and `/dashboard`.
3. **Missing OAuth:** Google/GitHub OAuth login pathways are visually present in the UI shells but the backend wiring is largely stubbed out.

---
- **Confidence Level:** High
- **Evidence Source:** `middleware.ts`, `api.ts`, and `auth_routes.py` structural analysis.
- **Next File to Read:** `09-share-link-and-reviewer-flow.md`
