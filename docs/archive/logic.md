# Business & Application Logic

This document explains the core decision-making rules and logic flows within STAGE.

## Identity Resolution Logic

STAGE uses a dual-layer authentication model. 
1. The frontend securely interacts with Firebase Authentication to handle Google SSO, GitHub OAuth, and Email Links.
2. The frontend passes a verified JWT ID token to the backend (`/auth/firebase-sync`).
3. The backend `identity_resolver.py` maps this token to a canonical `User` record in PostgreSQL.
   - It searches `user_identities` by provider ID.
   - If not found, it attempts a safe account merge by checking case-insensitive verified emails.
   - If a new user is created, it automatically provisions an owner `Organization` workspace.

## Billing & Entitlement Gating

Billing is managed via Dodo Payments. The application enforces entitlements using a centralized resolver (`services/plan_capabilities.py`).

**Free vs Paid Access:**
- Standard project creation and session review (markers/pins) are available to free tier users.
- The **Blueprint Canvas** feature is gated behind `has_blueprint_dom_edit=True`.
- The frontend `usePlan()` hook reads this entitlement. If a free user attempts to navigate to `/canvas/[projectId]`, the `RedirectToPricing` component forcefully routes them to the `/pricing` page.

## Share Link Behavior

Share links allow anonymous or guest stakeholders to review a STAGE session.
- **Resolution**: Evaluated in `POST /resolve-token/{token}` (`auth.py`).
- **Validation Rules**:
  - `expires_at`: Checked against `datetime.now(timezone.utc)`. Returns `410 Gone` if expired.
  - `max_uses`: Checked against `use_count`. Returns `410 Gone` if exhausted.
  - `is_active`: Allows manual revocation.
  - **Passwords**: If `password_hash` is present, the frontend must supply a plain-text password for bcrypt verification.
- **Reviewer Identity**: Guest reviewers are assigned transient `ReviewerIdentity` profiles linked to the session, which track their cursor presence and comment authorship without requiring full account creation.

## Notification Trigger Logic

The system distinguishes between Session events and Blueprint events.
- **Triggers**: Emitters in `routes/canvas.py` and `routes/sessions.py` invoke `NotificationService` in a non-blocking background task.
- **Delivery Strategy**: Notifications are queued into `notification_events` and `notification_delivery_attempts`.
- **Failure Handling**: If an email provider fails, the system executes an exponential backoff retry. It never blocks the user's primary action (e.g., publishing a draft never fails because an email bounced).

## Onboarding / Product Tour Logic

Product tours are triggered on the frontend based on the user's `onboarding_state_json`.
- State is hydrated from the backend upon login and stored in `onboardingStore.ts`.
- It is backed by a user-scoped local storage key (`stage_onboarding_state_{userId}`) to prevent state leakage across different accounts logging in on the same browser.
- New users with 0 projects reliably trigger the `"developer"` tour sequence.
