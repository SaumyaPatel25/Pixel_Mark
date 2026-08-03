# API Reference

This document maps the primary REST and WebSocket boundaries of the STAGE backend, organized by domain. 

*Note: All protected endpoints require a Bearer token in the Authorization header or an HttpOnly cookie containing a valid JWT.*

## Auth (`/auth`)
- **`POST /auth/register`**: Register a new user via email/password.
- **`POST /auth/login`**: Authenticate via email/password.
- **`POST /auth/firebase-sync`**: Syncs a Firebase ID token with the backend identity resolver and establishes a backend session cookie.
- **`GET /auth/oauth/github/start`**: Initiates GitHub OAuth flow.
- **`GET /auth/oauth/github/callback`**: Completes GitHub OAuth and maps identity.
- **`POST /auth/logout`**: Clears the backend session cookie.

## Projects (`/projects`)
- **`GET /projects`**: List projects belonging to the user's organization.
- **`POST /projects`**: Create a new project.
- **`GET /projects/{project_id}`**: Retrieve project details.
- **`DELETE /projects/{project_id}`**: Soft-delete a project.

## Sessions (`/sessions`)
- **`GET /sessions`**: List sessions for a project.
- **`POST /sessions`**: Create a new session targeting a specific URL.
- **`GET /sessions/{session_id}`**: Retrieve session metadata and metrics (pages visited).
- **`PATCH /sessions/{session_id}/status`**: Update session status (e.g., active, archived).

## Blueprint Canvas (`/canvas`)
- **`GET /canvas/{project_id}/edits`**: Fetch all saved Blueprint mutations for a project.
- **`POST /canvas/{project_id}/edits`**: Batch save/reconcile Blueprint mutations.
- **`DELETE /canvas/{project_id}/edits/{edit_id}`**: Delete a specific mutation.
- **`GET /canvas/{project_id}/edits/export/json`**: Export edits as a JSON payload for developer handoff.
- **`GET /canvas/{project_id}/edits/export/css`**: Export edits as a generated CSS stylesheet.
- **`POST /canvas/{project_id}/publications`**: Snapshot active edits into a `BlueprintPublicationModel`.
- **`GET /canvas/{project_id}/comments`**: Retrieve threaded comments for the canvas.
- **`POST /canvas/{project_id}/comments`**: Post a new canvas comment.
- **`GET /canvas/{project_id}/activity`**: Paginated audit log of canvas events.
- **`POST /canvas/{project_id}/summaries/generate`**: (AI) Generate a client-friendly summary of recent canvas changes.

## Proxy (`/proxy`)
- **`GET|POST /proxy/session/{session_id}/{path:path}`**: The primary reverse-proxy catch-all route. Intercepts traffic, rewrites HTML to inject the STAGE agent, resolves assets, and enforces SSRF protection.
- **`POST /proxy/record-visit`**: Records a page visit inside an active session context.

## Share Links (`/share-links`)
- **`POST /share-links`**: Generate a public review link for a session.
- **`GET /share-links/{id}`**: Retrieve share link metadata.
- **`POST /share-links/resolve/{token}`**: Validate a share link token (and optional password) to grant access to a session review.

## Notifications (`/notifications`)
- **`GET /notifications`**: Paginated in-app notifications feed for the authenticated user.
- **`PATCH /notifications/{id}/read`**: Mark specific notification as read.
- **`PATCH /notifications/read-all`**: Mark all notifications as read.
- **`GET /notifications/deliveries`**: Admin endpoint to view email delivery attempts and retry logs.
- **`POST /notifications/deliveries/{id}/retry`**: Manually trigger a retry for a failed email delivery.

## Realtime / WebSockets (`/ws`)
- **`WS /ws/sessions/{session_id}`**: Legacy Review mode channel. Syncs pins and markers.
- **`WS /ws/canvas/{project_id}`**: Blueprint presence channel. Syncs live mouse cursors, active selections, and broadcasts activity feed events across the project workspace.
