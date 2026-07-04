# Phase 3: Share Links & Reviewer Flow Fixes

## Problem Addressed
The audit revealed issues with the public collaboration flow:
1. **Redirect Loops / 404s:** Share links pointing to `/t/[token]` were redirecting to `/review/[project_id]?token=[token]`. However, the `/review/[token]` page expected the first path parameter to be the share link token itself. Passing the project ID caused the backend to throw a 404 since it couldn't find a share link with the project ID as its token.
2. **Missing Reviewer Identity:** Guest reviewers were prompted for their name, which was saved to `localStorage`, but this identity was never passed back to the backend. As a result, all markers dropped by external guests were attributed to "Anonymous".

## Solutions Implemented

### 1. Fix Frontend Route Alignment
- Modified `web/src/app/t/[token]/page.tsx` to redirect securely to `/review/${data.token}?role=${data.role}`.
- This ensures the `web/src/app/review/[token]` route receives the correct share token in its `params.token` slot, which it then uses to resolve the project and session properly through `api.shareLinks.resolve`.

### 2. Capture and Persist Guest Identity
- In `web/src/components/audit/AuditSurface.tsx`, the marker creation payload (`feedbackPayload`) now reads `localStorage.getItem('tester_name')` if a share token is active.
- Added `reviewer_name` to the payload.

### 3. Backend Schema & Model Updates
- Updated `FeedbackCreate` schema in `backend/schemas/core.py` to accept `reviewer_name: Optional[str] = None`.
- Updated `FeedbackOut` schema to expose `created_by: Optional[str] = None`.
- Modified the `create_feedback` route in `backend/routes/sessions.py` to correctly map `data.reviewer_name` to the database marker's `created_by` field, falling back to `user_id` for authenticated developers.

## Unresolved Issues / Known Limits
- **Multi-reviewer differentiation:** Guest reviewers are still tied to the browser's `localStorage`. If multiple reviewers use the same machine/browser without clearing storage, their identities may mix.
- **Badge UI:** While the API now correctly stores and returns `created_by`, the UI dashboard may need further updates to display a specific "Guest" badge or avatar for these users instead of a generic icon.
