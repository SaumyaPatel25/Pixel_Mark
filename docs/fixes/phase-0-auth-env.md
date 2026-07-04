# Phase 0: Environment and Auth Sanity

## Previous Broken Behavior
- **Authentication:** The frontend was utilizing both `localStorage` and `document.cookie` concurrently to store the `pm_token`. This caused infinite redirect loops when `middleware.ts` evaluated an expired or missing cookie, but client-side routing and Zustand still read a valid token from `localStorage`.
- **Environment Targeting:** Multiple frontend files had hardcoded localhost fallbacks (e.g. `http://127.0.0.1:8765`), leading to CORS errors or broken API calls when deploying to production (Vercel) because the API URL defaulted to the user's local machine instead of the Railway backend.
- **WebSocket Parsing:** WebSocket connections were aggressively parsing `window.location.host`, causing conflicts in production when the Vercel frontend tried to connect to a WS instance hosted on Railway.

## Exact Files Changed
- `web/src/store/authStore.ts`
- `web/src/lib/api.ts`
- `web/src/app/(auth)/login/LoginClient.tsx`
- `web/src/app/test/[shareToken]/page.tsx`
- All `.ts`/`.tsx` files containing `|| 'http://127.0.0.1:8765'` (via automated replacement).

## Final Auth Source of Truth
- **`document.cookie` (specifically `pm_token`)** is now the *only* source of truth for both edge routing (`middleware.ts`) and client-side requests (`api.ts`). `localStorage.setItem('pm_token', ...)` has been completely stripped out.

## Final Environment Vars Used
- `NEXT_PUBLIC_API_URL`: The absolute sole authority for the backend base URL (e.g., `https://pixelmark-backend.up.railway.app`). No hardcoded fallbacks exist in production code paths. WebSocket connections dynamically inherit this value by replacing `http/https` with `ws/wss`.

## Local Dev Run Instructions
1. In `web/.env.local`, set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` (or `8765` if using a proxy/wrapper).
2. Start the backend: `uvicorn main:app --port 8000`
3. Start the frontend: `npm run dev`
4. The system will dynamically read the ENV and format both standard requests and `ws://` correctly.

## Production Assumptions
- The frontend deployment (Vercel) *must* have `NEXT_PUBLIC_API_URL` populated. If it does not, the frontend will fail to make API calls instead of silently defaulting to `127.0.0.1`.
- Cookies must not have the `HttpOnly` flag enabled if `api.ts` uses client-side javascript to parse `document.cookie`. Currently, the cookie is set client-side via `authStore.ts` without `HttpOnly`, which fulfills this requirement.

## Manual Smoke Checklist
- [ ] Log into the application (Login works).
- [ ] Hard refresh the `/dashboard` or `/projects` page (Refresh works).
- [ ] Ensure the browser stays on the protected route (Protected routes stay accessible).
- [ ] Click "Logout" and verify the browser is redirected to `/login` (Logout clears auth cleanly).
- [ ] Navigate back to `/dashboard` manually and verify the Next.js middleware bounces the user back to `/login` (No login redirect loop).
- [ ] Inspect the network tab and confirm all `/api/*` and WebSocket `wss://*` requests are pointing to the domain specified in `NEXT_PUBLIC_API_URL`.
