# STAGE Deployment Status & Audit Report

## 1. Current Deployment Setup
STAGE is structured as a split-architecture application:
- **Frontend**: Next.js app deployed in Vercel (supporting both old and new domains).
- **Backend**: FastAPI (Python 3.11) application hosted on Render, serving as a unified api/websocket gateway.
- **Database**: Serverless Neon PostgreSQL connection using SQLAlchemy.
- **Cache/Session Store**: Redis database instance.
- **Authentication**: Dual-layer system:
  1. Frontend authenticates with Firebase Auth (GitHub, Google, Email link).
  2. Frontend sends Firebase ID token to backend `/auth/firebase-sync` to receive a canonical STAGE JWT (`stagetoken` cookie).

## 2. Multi-Domain & Routing Configuration
- **Old Frontend Domain**: `web-zeta-sable-82.vercel.app`
- **New Frontend Domain**: `stage.entrext.com`
- **Backend Render API Gateway URL**: `https://api.stage.entrext.com` (or Render default backend URL)
- **Allowed Frontend Domains**:
  - `https://stage.entrext.com`
  - `https://web-zeta-sable-82.vercel.app`
- **CORS / Origin Rules**:
  - Backend CORS is configured to allow `ALLOWED_ORIGINS` which explicitly list localhost, tailwindcss.com, the configured `settings.frontend_url`, and via regex matches any Vercel deployments (`https://.*\.vercel\.app`).
  - We are explicitly adding `https://stage.entrext.com` and `https://web-zeta-sable-82.vercel.app` to backend `ALLOWED_ORIGINS` to ensure both sites are fully authorized for CORS requests.
- **Next.js Middleware Redirects**:
  - Updated to allow both `stage.entrext.com` and `web-zeta-sable-82.vercel.app` as valid hosts without triggering canonical domain redirects.
  - Redirects are triggered only for non-canonical hosts on production Vercel builds (redirecting to `https://stage.entrext.com`).

---

## 3. Auth & Callback Dependencies
The following configurations are required to ensure authentication (Google, GitHub, Email Link) functions properly on both domains:

### Firebase Authorized Domains
Add these to Firebase Console (**Authentication > Settings > Authorized Domains**):
1. `localhost`
2. `web-zeta-sable-82.vercel.app`
3. `stage.entrext.com`
4. `stage-42a45.firebaseapp.com`
5. `stage-42a45.web.app`

### GitHub OAuth App Callback URLs
- **For Firebase Auth**: Configure the callback URL to the Firebase Auth handler:
  `https://stage-42a45.firebaseapp.com/__/auth/handler`
- **For Direct Backend Flow Fallback**: Configure the callback URL to the Render backend endpoint:
  `https://api.stage.entrext.com/auth/oauth/github/callback`

### Google Cloud Console Authorized Redirect URIs
- **For Firebase Auth**: Configure the callback URL to the Firebase Auth handler:
  `https://stage-42a45.firebaseapp.com/__/auth/handler`

---

## 4. Updates & Fixes (2026-08-07)
### GitHub Auth Flow Fix + Cancel Recovery
- **Status**: Completed
- **Root Cause**:
  1. **GitHub Auth Redirect**: The GitHub OAuth button redirected the page to the backend route `/auth/oauth/github/start` instead of using the client-side Firebase Popup login flow. Misconfiguration on Render caused it to redirect to the backend health/root check page.
  2. **UI Lock state**: When the auth flow began, the UI state was set to `'submitting'` (disabling all buttons). Navigating back from the redirect page restored the Javascript state from the bfcache, leaving it permanently locked in the `'submitting'` state unless refreshed.
- **Files Changed**:
  - `web/src/app/(auth)/login/LoginClient.tsx`
  - `web/src/app/(auth)/register/RegisterClient.tsx`
- **Verification Results**:
  - Frontend compiled with `npx tsc --noEmit` with exit code `0`.
  - Firebase `signInWithPopup(auth, githubProvider)` is verified to be used directly on the client side.
  - Cancel error handlers successfully reset the UI state to `'projecting'` (idle) immediately upon popup closure.
  - The `pageshow` listener successfully handles back-navigation bfcache restorations.
  - Confirmed backend health route is no longer used in auth flow.
- **Next Step**: auth regression tests across providers

