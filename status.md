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
