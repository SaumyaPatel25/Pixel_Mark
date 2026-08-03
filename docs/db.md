# Database Schema

STAGE uses PostgreSQL as its primary datastore, managed via SQLAlchemy ORM (see `backend/models/core.py`) and Alembic for migrations.

## Core Entities

### User & Identity Management
- **`users`**: The canonical user record (`id`, `email`, `hashed_password`, `onboarding_state_json`).
- **`user_identities`**: Maps external OAuth providers (Firebase Google/GitHub) to canonical users. Unique constraint on `(provider, provider_user_id)`.
- **`organizations` / `org_members`**: Workspaces containing projects. Users are tied to orgs via roles (`owner`, `admin`, `member`, `guest`).

### Project & Session Layer
- **`projects`**: A top-level container for a specific website target (`url`, `allow_reviewer_dom_edit`).
- **`environments`**: Manages staging vs prod URLs for a project.
- **`sessions`**: Represents an active review or collaboration workspace instance pointing to a proxy target. Tracks `conservative_render_mode` and `pages_visited`.
- **`page_visits`**: Records history of subpages visited during a proxy session.

## Blueprint Canvas Architecture

The Blueprint feature utilizes a complex relational model to track DOM mutations safely:

- **`blueprint_mutations`**: The core table mapping a CSS `target_selector` to an `action_type` (e.g., style change, text swap) and storing the raw `html_payload`. 
- **`canvas_frames`**: Represents isolated visual containers/artboards in the workspace (`width`, `height`, `position_x`).
- **`blueprint_publications`**: Snapshots a collection of edits into a versioned release state (`draft`, `in_review`, `approved`).
- **`blueprint_comments`**: Threaded feedback mapped to specific `target_selector` elements or frames.
- **`blueprint_activities`**: The audit log storing chronological events (`event_type`, `summary_text`) broadcasted to the activity feed.

## Access & Sharing

- **`share_links`**: Grants anonymous or password-protected access to sessions. Tracks `expires_at` and `max_uses`.
- **`reviewer_dom_edit_suggestions`**: Allows non-authenticated reviewers to propose DOM changes requiring admin approval.

## Billing & Notifications

- **`subscriptions`**: Links an `org_id` to a Dodo Payments `dodo_subscription_id`, tracking the active `plan_type` and seat caps.
- **`notification_events`**: Stores the normalized payload for in-app feeds (`title`, `body`, `category`).
- **`notification_delivery_attempts`**: Tracks retry logic for email delivery (`status`, `attempt_number`, `next_retry_at`).

## Schema Drift / Gaps
*Needs Verification*: `share_links_migration.sql` implies some manual SQL operations were performed outside Alembic. Ensure Alembic state matches raw DB state.
