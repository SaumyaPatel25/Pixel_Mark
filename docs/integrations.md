# Integrations and External Services

This document details the configuration settings, secrets, and verification logic for external services integrated with PixelMark.

---

## 1. Database Integrations
PixelMark supports PostgreSQL (via Neon) for production deployments and SQLite for local development:
- **Connection Configuration**:
  - SQLite: `sqlite+aiosqlite:///./pixelmark.db` or `sqlite+aiosqlite:///./test.db`
  - Neon PostgreSQL: `postgresql+asyncpg://{user}:{password}@{host}/{db}?sslmode=require`
- **ORM**: SQLAlchemy.
- **Connection Strategy**: Connection sessions are managed via FastAPI dependency wrappers (`backend/dependencies.py`). Lifespan hooks retry connection validation up to 5 times.
- **Schema Migrations**: Managed via Alembic (`backend/alembic/env.py`). Enforces strict asynchronous connection executions.

---

## 2. Redis Pub/Sub (Realtime Message Broker)
- **Use Case**: Coordinates cursor movements and marker updates across multiple FastAPI backend server instances.
- **Connection Variable**: `REDIS_URL` (format: `redis://[:password]@host:port/db`).
- **Logic**: Connection loops are managed by `redis_broadcaster` (`backend/realtime/redis_broadcaster.py`). If the connection fails or `REDIS_URL` is undefined, the server falls back to single-instance memory broadcasting.

---

## 3. GitHub OAuth (Developer SSO Authentication)
Allows developers to register or login using their GitHub accounts.
- **Redirect Sequences**:
  1. Frontend navigates to `/auth/oauth/github/start`.
  2. Backend redirects to: `https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={REDIRECT_URI}&state={CSRF_STATE}`.
  3. User logs in on GitHub. GitHub redirects the user back to the backend at `/auth/oauth/github/callback?code={AUTH_CODE}&state={STATE}`.
  4. Backend exchanges `AUTH_CODE` for an access token via: `POST https://github.com/login/oauth/access_token`.
  5. Backend fetches the user profile from: `GET https://api.github.com/user`.
  6. Backend creates a user account if it doesn't exist, logs the user in, and redirects the user to the frontend dashboard.
- **Configuration Variables**:
  - `GITHUB_CLIENT_ID`: App registration key.
  - `GITHUB_CLIENT_SECRET`: App registration secret.
  - `GITHUB_REDIRECT_URI`: Path matching `{server_url}/auth/oauth/github/callback`.

---

## 4. Resend (Email Notification Gateway)
- **Use Case**: Delivers account verification emails, password resets, and audit PDF exports.
- **Configuration Variable**: `RESEND_API_KEY` (format: `re_...`).
- **Service Integration**: Managed in `backend/services/email.py`. Uses `resend` client SDK to dispatch emails. If the key is missing or in development, email contents are outputted to the server logs instead.

---

## 5. PostHog (Frontend Product Analytics)
- **Use Case**: Tracks product analytics events (e.g. session views, registrations, and report exports).
- **Frontend Configuration**:
  - `NEXT_PUBLIC_POSTHOG_KEY`: Public analytics token.
  - `NEXT_PUBLIC_POSTHOG_HOST`: Domain endpoints (`https://app.posthog.com`).
- **Store Integration**: Integrated into the auth store (`web/src/store/authStore.ts`). Calls `posthog.identify` on login and `posthog.reset()` on logout.

---

## 6. AI Providers (Visual Triage Summaries)
- **Use Case**: Triages visual bug markers, generates summary reports, and suggests layout fixes.
- **Config Table**: `user_ai_provider_configs` stores API keys dynamically in the database, encrypted using cryptography keys.
- **Supported Providers**: OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet).

---

## 7. Proxy Asset Whitelists
To prevent SSRF exploits while allowing websites to load correctly, the proxy rewriter (`backend/utils/proxy_rewriter.py`) permits requests to the following external domains:
- Cloudflare CDN: `https://cdnjs.cloudflare.com`
- Tailwind CDN: `https://cdn.tailwindcss.com`
- Unpkg Package CDN: `https://unpkg.com`
- Google Fonts API: `https://fonts.googleapis.com`
- Google Fonts Static assets: `https://fonts.gstatic.com`
- Safe asset CDNs: `*.fastly.net`, `*.cloudfront.net`.
- *Evidence: backend/utils/ssrf_guard.py:34-48*

---

## 8. Firebase Authentication (Identity Provider)
Used for client-side authentication, including Google Sign-In and Email Verification link flows.
- **Verification Flow**:
  1. Frontend uses Firebase client SDK to execute email/password registration, password/login verification, or Google authentication popup flows.
  2. For email/password sign-up, the frontend triggers `sendEmailVerification`.
  3. Gated access: If the user is unverified, the frontend blocks dashboard access and prompts verification or resending.
  4. Once verified, the client sends the Firebase ID Token (`id_token`) to the backend `/auth/firebase-sync` endpoint.
  5. The backend validates the Firebase ID token by executing a secure REST POST to Google's Identity Toolkit:
     `POST https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}`.
  6. On successful validation, the backend upserts the user profile, creates default workspace settings, links the provider identity in `user_identities`, and responds with a standard signed HS256 JWT access token (`pm_token`) for subsequent request authorizations.
- **Frontend Configuration Settings**:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- **Backend Configuration Settings**:
  - `FIREBASE_API_KEY`: API credential key.
  - `FIREBASE_PROJECT_ID`: Target Firebase application ID.

