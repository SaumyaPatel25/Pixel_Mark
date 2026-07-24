# Repository Documentation Status

## Current phase
- Phase 26: Blueprint Multi-User Presence + Live Cursors
- Status: Completed
- Last updated timestamp: 2026-07-24T18:37:00Z
- Note: Session canvas, markers, and existing session WebSocket/presence untouched

## Task Execution Summary: Blueprint Multi-User Presence + Live Cursors
- **Task Title**: Blueprint Multi-User Presence + Live Cursors
- **Status**: Completed
- **Files Added**:
  - `backend/realtime/blueprint_presence.py`
  - `backend/routes/blueprint_ws.py`
  - `web/src/store/useBlueprintPresenceStore.ts`
  - `web/src/hooks/useBlueprintPresence.ts`
  - `web/src/components/blueprint/BlueprintPresenceStack.tsx`
  - `web/src/components/blueprint/BlueprintRemoteCursors.tsx`
- **Files Changed**:
  - `backend/main.py`
  - `web/src/components/blueprint/BlueprintToolbar.tsx`
  - `web/src/components/blueprint/BlueprintStage.tsx`
  - `web/src/components/blueprint/BlueprintWorkspace.tsx`
  - `status.md`
- **Session Review Isolation Confirmation**: Session review files (`AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, session review WebSocket router `/ws/sessions/{session_id}`, and Redis session channel `sessions:{id}`) remain 100% untouched and uncoupled.
- **Dedicated WS Route & Redis Channel Naming**:
  - WS Endpoint: `WS /ws/canvas/{project_id}`
  - Redis Channel Namespace: `canvas:presence:{project_id}`
- **Branding**: "STAGE" branding is strictly used across all new UI copy, presence stack tooltips, and status entries.
- **Known Limitations**: Cursor precision is relative to stage container pan/zoom coordinates; selection highlights are scoped to frame/target selectors.
- **Next Step**: Blueprint activity feed / audit log for team changes.

## Task Execution Summary: Blueprint Collaboration Layer (Comments + Approvals)
- **Task Title**: Blueprint Collaboration Layer (Comments + Approvals)
- **Status**: Completed
- **Files Added**:
  - `web/src/store/blueprintCollaborationStore.ts`
  - `web/src/components/blueprint/BlueprintCommentPin.tsx`
  - `web/src/components/blueprint/BlueprintCommentComposer.tsx`
  - `web/src/components/blueprint/BlueprintCommentThread.tsx`
- **Files Changed**:
  - `backend/models/core.py`
  - `backend/schemas/core.py`
  - `backend/routes/canvas.py`
  - `web/src/lib/api.ts`
  - `web/src/components/blueprint/BlueprintChangesetModal.tsx`
  - `web/src/components/blueprint/BlueprintToolbar.tsx`
  - `web/src/components/blueprint/BlueprintLiveFrame.tsx`
  - `web/src/components/blueprint/BlueprintWorkspace.tsx`
  - `status.md`
- **Session Canvas Confirmation**: Session canvas, `AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, session review routes, and session WebSockets remain 100% untouched.
- **New Comment & Approval Endpoints**:
  - `GET /canvas/{project_id}/comments`: Retrieve threaded comments for project.
  - `POST /canvas/{project_id}/comments`: Post new Blueprint comment or reply.
  - `PATCH /canvas/{project_id}/comments/{comment_id}`: Edit comment body or status.
  - `DELETE /canvas/{project_id}/comments/{comment_id}`: Delete comment and replies.
  - `POST /canvas/{project_id}/comments/{comment_id}/resolve`: Toggle resolved/open status.
  - `PATCH /canvas/{project_id}/publications/{publication_id}/status`: Update publication status (`draft`, `in_review`, `approved`, `changes_requested`) with role-based approval enforcement.
  - `GET /canvas/{project_id}/publications/{publication_id}/history`: Fetch publication status change history timeline.
- **Branding**: "STAGE" branding is strictly used across all new UI copy and status messages.
- **Known Limitations**: None.
- **Next Step**: Blueprint multi-user presence + live cursors (optional stretch).

## Task Execution Summary: Blueprint Publish Export Handoff
- **Task Title**: Blueprint Publish Export Handoff
- **Status**: Completed
- **Files Added**:
  - `web/src/components/blueprint/BlueprintChangesetModal.tsx`
  - `web/src/app/blueprint/published/[publicationId]/page.tsx`
- **Files Changed**:
  - `backend/models/core.py`
  - `backend/schemas/core.py`
  - `backend/routes/canvas.py`
  - `web/src/lib/api.ts`
  - `web/src/components/blueprint/BlueprintToolbar.tsx`
  - `status.md`
- **Session Canvas Confirmation**: Session review files (`AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, session review exports, session share links, and session WebSockets) remain 100% untouched.
- **Export & Publication Endpoints Added**:
  - `GET /canvas/{project_id}/edits/export/json`: Structured JSON containing project context, frame info, ordered operations, timestamps.
  - `GET /canvas/{project_id}/edits/export/css`: Generated CSS stylesheet grouped by target selectors with headers & comments.
  - `GET /canvas/{project_id}/edits/export/markdown`: Human-readable developer/client handoff summary.
  - `POST /canvas/{project_id}/publications`: Snapshot active Blueprint state into a stable `BlueprintPublicationModel` with a share token.
  - `GET /canvas/{project_id}/publications`: List all publications for a project.
  - `GET /canvas/publications/{publication_id}`: Fetch single publication details & snapshot data.
  - `GET /canvas/publications/token/{share_token}`: Public/shared read-only access for Blueprint handoff.
- **Blueprint Handoff Route**:
  - Route: `/blueprint/published/[publicationId]`
  - Confirmation: 100% separate from `/review/[sessionId]` and uses zero session review code.
- **Known Limitations**: None.
- **Next Step**: Blueprint collaboration comments / approvals / multi-user workflow.

## Progress
- **Task Title**: Blueprint Project-Scoped Persistence
- **Status**: Completed
- **Files Added**: None.
- **Files Changed**:
  - `backend/models/core.py`
  - `backend/schemas/core.py`
  - `backend/routes/canvas.py`
  - `web/src/lib/api.ts`
  - `web/src/store/blueprintStore.ts`
  - `web/src/components/blueprint/BlueprintWorkspace.tsx`
  - `web/src/components/blueprint/BlueprintToolbar.tsx`
  - `status.md`
- **Session Canvas Confirmation**: Session review files (`AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, `/sessions/{id}/dom-edits`, review routes, and review WebSockets) remain 100% untouched.
- **Persistence Model Summary**:
  - Model: `BlueprintMutationModel` (tablename `blueprint_mutations`) in `backend/models/core.py` with fields `id`, `project_id`, `canvas_frame_id`, `page_url`, `target_selector`, `action_type`, `preset_id`, `preset_name`, `html_payload`, `sort_order`, `created_at`, `updated_at`.
  - Endpoints created:
    - `GET /canvas/{project_id}/edits`: Fetch project-scoped Blueprint mutations.
    - `POST /canvas/{project_id}/edits`: Batch save/reconcile project-scoped Blueprint mutations.
    - `DELETE /canvas/{project_id}/edits/{edit_id}`: Delete individual mutation.
    - `DELETE /canvas/{project_id}/edits`: Clear all mutations for project.
    - `GET /canvas/{project_id}/edits/export/json`: Export Blueprint edits as JSON.
    - `GET /canvas/{project_id}/edits/export/css`: Export Blueprint edits as CSS.
- **Frontend Hydration & Save Verification**:
  - Edits automatically load on mount via `loadPersistedEdits(projectId)` and reconcile inside the proxied iframe.
  - Manual Save button in top toolbar saves pending mutations and updates status badge (`Saved`, `Saving...`, `Unsaved edits`, `Save failed`).
  - Export JSON / CSS download options are available in the top toolbar.
- **Known Limitations**: None.
- **Next Step**: Blueprint publish/export + collaboration layer.

## Progress
- **Task Title**: Blueprint Undo Redo Reset
- **Status**: Completed
- **Files Added**: None.
- **Files Changed**:
  - `backend/static/stage-agent.js`
  - `web/src/store/blueprintStore.ts`
  - `web/src/components/blueprint/BlueprintLiveFrame.tsx`
  - `web/src/components/blueprint/BlueprintToolbar.tsx`
  - `web/src/components/blueprint/BlueprintWorkspace.tsx`
  - `status.md`
- **Session Canvas Confirmation**: Session review files (`AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, `domEditStore.ts`, review routes, and review WebSockets) remain 100% untouched.
- **Undo/Redo/Reset Verification**:
  - Inspector edits (text, colors, sizes, container styles) and Pick & Place actions (replace, before, after, inside) all commit history checkpoints automatically.
  - Undo (`Ctrl+Z`) steps backward through history snapshots and reconciles the iframe DOM.
  - Redo (`Ctrl+Shift+Z` / `Ctrl+Y`) reapplies undone snapshots and reconciles the iframe DOM.
  - Reset (`RotateCcw` button) restores the pristine baseline snapshot with user confirmation dialog.
- **Known Limitations**: None.
- **Next Step**: Persist Blueprint mutations and export project-scoped DOM edits.

## Progress
- **Task Title**: Blueprint Inspector Selection Wiring Fix
- **Status**: Completed
- **Root Cause Found**: `BlueprintInspector` previously checked `!currentFrame` first, ignoring `selectedTarget`. When a user clicked a live DOM target, `selectedTarget` was populated in Zustand, but the Inspector rendered the empty state because `currentFrame` was not prioritized.
- **Files Added**: None.
- **Files Changed**:
  - `web/src/components/blueprint/BlueprintInspector.tsx`
  - `web/src/components/blueprint/BlueprintLiveFrame.tsx`
  - `web/src/store/blueprintStore.ts`
  - `status.md`
- **Session Canvas Confirmation**: Session canvas, `AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, `domEditStore.ts`, proxy engine, and review mode remain 100% untouched.
- **Verification**: `npx tsc --noEmit` passed with 0 errors.
- **Next Step**: Persist Blueprint mutations and map to DOM edit operations.

## Progress
- **Task Title**: Blueprint Live Frame + Pick and Place
- **Status**: Completed
- **Files Added**:
  - `web/src/components/blueprint/BlueprintLiveFrame.tsx`
  - `web/src/components/blueprint/BlueprintPresetLibrary.ts`
  - `web/src/components/blueprint/BlueprintPresetLibraryPanel.tsx`
- **Files Changed**:
  - `web/src/store/blueprintStore.ts`
  - `web/src/components/blueprint/BlueprintFrame.tsx`
  - `web/src/components/blueprint/BlueprintWorkspace.tsx`
  - `web/src/components/blueprint/BlueprintToolRail.tsx`
  - `web/src/components/blueprint/BlueprintInspector.tsx`
  - `status.md`
- **Session Canvas Confirmation**: Session canvas, `AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, `domEditStore.ts`, proxy engine, and review mode remain 100% untouched.
- **Live Proxy Frame**: Working in Blueprint. Proxied page iframe embeds seamlessly inside Blueprint frame with viewport indicators and reload support.
- **Pick-and-Place**: Working locally in Blueprint. Users can pick DOM targets, select presets across 5 categories, choose insertion actions (`replace`, `before`, `after`, `inside`), and see instant visual preview mutations.
- **Known Limitations**: Local mutations are tracked in Blueprint state (`pendingMutations`) for visual preview; backend persistence mapping is scheduled for Phase 21.
- **Verification**: `npx tsc --noEmit` passed with 0 errors.
- **Next Step**: Persist Blueprint mutations and map to DOM edit operations.

## Progress
- **Task Title**: Blueprint Canvas Rebuild Shell
- **Status**: Completed
- **Files Added**:
  - `web/src/store/blueprintStore.ts`
  - `web/src/components/blueprint/BlueprintWorkspace.tsx`
  - `web/src/components/blueprint/BlueprintToolbar.tsx`
  - `web/src/components/blueprint/BlueprintToolRail.tsx`
  - `web/src/components/blueprint/BlueprintStage.tsx`
  - `web/src/components/blueprint/BlueprintFrame.tsx`
  - `web/src/components/blueprint/BlueprintInspector.tsx`
  - `web/src/components/blueprint/BlueprintLayersPanel.tsx`
- **Files Changed**:
  - `web/src/app/(dashboard)/canvas/[projectId]/page.tsx`
  - `status.md`
- **Files Deleted**: None (deletion phase was completed in Phase 18).
- **Session Canvas Confirmation**: Session canvas, `AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, `domEditStore.ts`, proxy engine, and review mode remain 100% untouched.
- **Verification**: `npx tsc --noEmit` passed with 0 errors.
- **Next Step**: Embed live proxied page into Blueprint frame.

## Progress
- **Task Title**: Blueprint Canvas Full Removal
- **Status**: Completed
- **Files Removed**:
  - `web/src/components/canvas/BlueprintDomEditInspector.tsx`
  - `web/src/components/canvas/BlueprintInspector.tsx`
  - `web/src/components/canvas/Canvas.tsx`
  - `web/src/components/canvas/CanvasFrame.tsx`
  - `web/src/components/canvas/LinkViewerPanel.tsx`
  - `web/src/components/canvas/SessionPickerModal.tsx`
  - `web/src/store/blueprintStore.ts`
  - `web/src/store/canvasStore.ts`
- **Files Changed**:
  - `web/src/app/(dashboard)/canvas/[projectId]/page.tsx`
  - `status.md`
- **Placeholder Route Added**: Yes (`web/src/app/(dashboard)/canvas/[projectId]/page.tsx` updated with minimal, clean placeholder component).
- **Session Canvas Confirmation**: Session canvas, `AuditSurface.tsx`, `DrawingCanvas.tsx`, `markerStore.ts`, `sessionStore.ts`, `domEditStore.ts`, proxy engine, and review mode remain 100% untouched.
- **Verification**: `npx tsc --noEmit` passed with 0 errors.
- **Next Step**: Design and rebuild Blueprint Canvas architecture.

## Progress
- Files/directories discovered: 548 (538 readable + 10 skipped)
- Readable files inspected: 42 key files
- Generated/vendor/binary files skipped: 10
- Documentation files created or updated: 44
- Validation tasks completed: 24

## Current work
- None. Complete rebrand from PixelMark to STAGE is finished.

## Task Execution Summary: Rebrand to STAGE
- **Status**: Completed & Verified (July 22, 2026)
- **Scope**: Rebranded the entire codebase (frontend, backend, extension, docs, tests) from "PixelMark" to "STAGE".
- **Key Implementation Details**:
  - Replaced brand string references across all casing variations: `PixelMark`/`PIXELMARK` -> `STAGE`, `pixelmark`/`pixel-mark`/`pixel_mark` -> `stage`, `Pixelmark` -> `Stage`.
  - Configured tagline to: `"STAGE — Share. Review. Approve."`
  - Configured positioning line to: `"The collaboration layer between clients and developers."`
  - Renamed physical files/directories containing brand terms (e.g., `pixelmark-agent.js` -> `stage-agent.js`).
  - Added dual-read cookie/header shim (`stagetoken` with fallback to `pm_token` / `pmtoken`) to ensure active sessions are not logged out.
  - Verified backend compiles successfully and typescript runs with zero errors.
  - SSRF guard unit tests passed successfully.
- **Session Canvas Integrity**: Session canvas and all core functional code remains untouched.

## Task Execution Summary: Blueprint Canvas Live Session Embed
- **Status**: Completed & Verified
- **Dependencies & Source of Truth**:
  - `CanvasFrame.session_id` schema field utilized.
  - Reused existing FastAPI proxy route (`/proxy/session/{sessionId}`) and `stage-agent.js` event emitter without modifying SSRF guard or proxy core.
  - Reused existing DOMEdit session persistence model (`POST /sessions/{sessionId}/dom-edits` and `export.css`).
- **Files Created / Modified**:
  - `backend/schemas/core.py` `[MODIFY]`: Added `session_id: Optional[str] = None` to `CanvasFrameUpdate` schema to support `PATCH /canvas/frames/{frame_id}`.
  - `web/src/store/blueprintStore.ts` `[MODIFY]`: Added `connectSessionToFrame`, `disconnectSessionFromFrame`, and `setBlueprintDomTargetFromClick` actions.
  - `web/src/components/canvas/SessionPickerModal.tsx` `[NEW]`: Created modal to list project sessions, disconnect active session, or create and connect new sessions.
  - `web/src/components/canvas/CanvasFrame.tsx` `[MODIFY]`:
    - Embedded live proxied iframe (`src="${API_BASE}/proxy/session/${frame.session_id}"`) when `session_id` is present while maintaining frame title bar and badges.
    - Added "Live Session" badge alongside "Draft edits" / "Saved edits" / "No target".
    - Added inline prompt when DOM Edit Tool is active without a connected session ("Connect a session to enable DOM editing on this frame.").
    - Added postMessage event listener when frame is selected in DOM Edit Tool mode to populate `BlueprintDomTarget` without triggering marker creation.
  - `web/src/components/canvas/BlueprintDomEditInspector.tsx` `[MODIFY]`: Added session connection warning in DOM Target section when `frame.session_id` is missing.
  - `status.md` `[MODIFY]`: Updated task log.

## Completed work
- Phase 0: Initialize Tracking
- Phase 1: Repository Inventory
- Phase 2: Full Source Reading & Subsystem Analysis
- Phase 3: Architecture Inference
- Phase 4: Documentation Creation
- Phase 5: Verification & Push to GitHub
- Phase 6: Meta-Protocol Setup
- Phase 7: Firebase Auth Integration (Execution & Verification)
- Phase 8: Firebase passwordless email link setup (Option A) (Completed)
- Phase 9: Homepage Streamlining and Performance Optimization (Completed)
- Phase 10: Blueprint Edit Mode Refactor & DOMEdit Persistence Integration (Completed)
- Phase 11: Blueprint DOM Edit Tool Shell (Completed)
- Phase 12: Blueprint DOM Edit Target + Draft State (Completed)
- Phase 13: Blueprint DOM Edit Backend Model + API (Completed)
- Phase 14: Blueprint DOM Edit Frontend API Wiring (Completed)
- Phase 15: Blueprint DOM Edit CSS Export (Completed)
- Phase 16: Canvas Rules of Hooks Bugfix (Completed)
- Phase 17: Blueprint Canvas Live Session Embed (Completed)
- Rebrand to STAGE (Completed)

## Open questions / uncertainties
- None.

## Next actions
- Project-scoped persistence for Blueprint DOM editing and Pick & Place mutations.
