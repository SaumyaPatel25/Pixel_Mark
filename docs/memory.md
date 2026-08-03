# Memory & State Management

This document maps the state layers, caching, and persistence mechanisms across the STAGE platform.

## Frontend State (Zustand Ecosystem)

STAGE relies on Zustand for complex, reactive state management across the Next.js application, completely replacing React Context for performance.

- **`authStore.ts`**: Holds the authenticated user profile, JWT token status, and session hydration logic.
- **`blueprintStore.ts`**: The heaviest store. Manages the active Canvas target, pending DOM mutations, selected presets, and viewport scaling state.
- **`onboardingStore.ts`**: Tracks the user's progress through product tours. Uses user-scoped local storage persistence (`stage_onboarding_state_{userId}`).
- **`useNotificationStore.ts`**: Caches the unread notification feed and polling state.
- **`markerStore.ts` / `sessionStore.ts`**: Manages the placement, resolution, and coordinates of review pins.

## Backend Caching Layer

The proxy engine (`proxy` module) performs heavy `httpx` fetching. To ensure low latency and prevent overwhelming target websites, STAGE employs a custom backend cache (`services/cache.py`).

- **HTML vs Assets**: 
  - `text/html` responses are **never** cached. This ensures that every page load accurately triggers page visit tracking and intercepts the latest DOM state.
  - Non-HTML assets (CSS, JS, Fonts, Images) are aggressively cached in-memory.
- **Cache Headers**: Cache hits return a `X-STAGE-Cache: HIT` header.

## Database Persistence

PostgreSQL is the canonical source of truth.
- Passwords, OAuth hashes, and share link tokens are cryptographically secured using bcrypt (`crypto.py`).
- Active session cookies are signed and scoped strictly.

## Realtime Presence & Volatile Memory

The WebSocket layer (`realtime` module) utilizes Redis Pub/Sub to track ephemeral state.
- Live cursor coordinates and active DOM selections in the Blueprint Canvas are broadcasted over `canvas:presence:{project_id}`.
- This state is strictly volatile; if the WebSocket disconnects, the presence stack flushes the user's cursor.

## Known Risks & Stale Data Vectors

> [!WARNING]
> **Concurrent Edits**: The Blueprint mutation pipeline currently resolves edits based on timestamp sorts (`sort_order`, `updated_at`). If two team members edit the same DOM selector simultaneously, the last-write-wins.
> **Auth Expiry**: Firebase ID tokens expire hourly. `AuthInitializer.tsx` uses an `onIdTokenChanged` listener to gracefully request a new backend cookie via `/auth/firebase-sync` to prevent unexpected 401s during long proxy sessions.
