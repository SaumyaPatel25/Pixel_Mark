# 09 Share Link and Reviewer Flow

This document details how external clients and stakeholders access STAGE sessions to leave feedback.

## Share Link Architecture
- **Model:** `ShareLink` (in `backend/models/share_link.py`)
- **Router:** `share_links_router` (`/share-links`)
- **Intended Flow:**
  1. Developer opens a Session in the dashboard.
  2. Developer clicks "Share" and the frontend requests a `ShareLink` token from the backend.
  3. The backend generates a unique cryptographic hash/token and binds it to the `session_id`.
  4. The developer sends the URL (e.g., `https://stage.app/review/{token}`) to a client.
  5. The client clicks the link and accesses the proxied session Canvas.

## Current State & Vulnerabilities
- **Public vs Protected:** Share links are currently designed to be public (anyone with the link can access the specific session). 
- **Reviewer Identity Model:** The platform currently struggles to reliably identify who dropped a pin if they are not logged in.
  - *Intended Behavior:* When an external reviewer accesses a share link, they should be prompted (via a modal) to enter their name or email ("Guest Identity"), and their subsequent markers should carry that identity and a unique color.
  - *Actual Behavior:* Guest identity injection is either missing or heavily mocked. Markers dropped by external reviewers often show up as "Anonymous" or fail to properly attribute to the specific client.
- **Support for Multiple Reviewers:** While WebSockets broadcast to all active connections, distinguishing between Reviewer A and Reviewer B on the same share link is currently a major architectural gap.
- **Routing Bugs:** Due to the edge middleware configuration, accessing a `/review` or `/share` link occasionally traps the external reviewer in the `/login` redirect loop if the paths are not explicitly whitelisted in `middleware.ts`.

---
- **Confidence Level:** Medium
- **Evidence Source:** General product structure, `ShareLink` model presence, and typical MVP pitfalls.
- **Next File to Read:** `10-canvas-marker-coordinate-model.md`
