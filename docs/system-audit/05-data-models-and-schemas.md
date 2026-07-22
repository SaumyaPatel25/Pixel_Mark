# 05 Data Models and Schemas

This document maps out the core SQLAlchemy database models and relationships driving the STAGE backend.

## Core Models

### 1. Account & Auth
- **`User`**
  - *Fields:* id, email, hashed_password, created_at
  - *Purpose:* Primary developer accounts.
- **`UserIdentity`** / **`AuthToken`** / **`ApiKey`**
  - *Purpose:* Auth-related models (likely tracking OAuth identities, session tokens, and developer API keys).
- **`Organization`** & **`OrgMember`**
  - *Purpose:* Multi-tenant grouping (teams). Currently, most operations in the app assume a 1:1 user-to-project relationship, making these models potentially under-utilized.

### 2. Project Hierarchy
- **`Project`**
  - *Fields:* id, name, url, user_id, organization_id, created_at
  - *Purpose:* The core entity representing a target website.
  - *Relations:* Owns Sessions, Environments, CanvasFrames.
  - *Mismatches:* Frontend schemas frequently mismatch backend definitions (e.g., frontend expected a `description` field that was recently removed from the backend, causing 500 errors).
- **`Environment`**
  - *Purpose:* Distinguishes between Staging/Prod target URLs.

### 3. Review Sessions
- **`Session`**
  - *Fields:* id, project_id, name, type (e.g., 'live_review', 'snapshot'), status, last_heartbeat_at
  - *Purpose:* An isolated container for a single review cycle.
  - *Relations:* Owns Markers, PageVisits.
- **`ShareLink`** (in `share_link.py`)
  - *Purpose:* Token-based links to grant external reviewers access to a specific `Session` without an account.

### 4. Collaboration & Feedback
- **`Marker`**
  - *Fields:* id, session_id, x, y, viewport_width, viewport_height, status (draft, open, resolved), content/comment
  - *Purpose:* The core visual feedback pin dropped on a website.
  - *Relations:* Belongs to Session.
  - *Missing/Mismatched Fields:* Coordinate models (`x`, `y`) struggle to map perfectly across viewports. Often lacks robust DOM-selector anchors for resilience.
- **`PageVisit`**
  - *Purpose:* Tracks navigation events within a proxied session so developers know exactly what URL a reviewer was on when dropping a pin.
- **`DOMEdit`**
  - *Purpose:* Tracks visual DOM manipulation events (like hiding elements or changing text).

### 5. Advanced / Canvas
- **`CanvasFrame`** & **`CanvasFlow`**
  - *Purpose:* Stores pre-rendered or organized snapshots of specific pages (the "Command Center" visual representation).
- **`AuditArtifact`** & **`UserAIProviderConfig`**
  - *Purpose:* Stores outputs from AI tools and LLM provider keys.

## Data Contract Mismatches & Risks
1. **Migrations via Raw SQL:** The `main.py` explicitly runs `ALTER TABLE` commands on startup (e.g., adding `status` and `last_heartbeat_at` to `Session`). If a developer spins up a fresh DB, these manual alterations might conflict with `Base.metadata.create_all` depending on execution order.
2. **Schema vs Model Drift:** FastAPI Pydantic schemas in `schemas/` routinely fall out of sync with SQLAlchemy models, as evidenced by recent 500 bugs on the dashboard.
3. **Cascades:** Deleting a `Project` must cascade to `Sessions`, `Markers`, and `CanvasFrames`, but explicit cascading configurations need strict verification.

---
- **Confidence Level:** Medium-High (Class names extracted accurately, field logic inferred from standard practice and recent bug fixes).
- **Evidence Source:** `backend/models/core.py`, `backend/models/share_link.py`, and `backend/main.py`.
- **Next File to Read:** `06-api-inventory.md`
