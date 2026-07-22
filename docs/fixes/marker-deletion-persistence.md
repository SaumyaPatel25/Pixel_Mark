# Fix: Marker Deletion Persistence

## Root Causes Found

Three independent bugs combined to produce the "deleted marker reappears on refresh" symptom:

---

### Bug 1 — Backend: No WebSocket Broadcast on Delete
**File:** `backend/routes/markers.py`, function `delete_marker`

The backend correctly committed the hard-delete to the database, but never called `manager.broadcast(...)` with a `marker_deleted` event. This meant **only the client that clicked delete** saw the marker disappear — all other connected clients continued to show it until they manually refreshed.

---

### Bug 2 — Frontend: Tombstone List Wiped on First-Run Cleanup
**File:** `web/src/store/overlayStore.ts`, function `performOneTimeCleanup`

On the first page load after a store version upgrade, the cleanup routine called:
```js
localStorage.removeItem('stage_deleted_markers_v3')
```
This wiped the client's only record of which markers had been deleted. On the next hydration cycle (`hydratePersistedFeedback`), the overlay store would see no tombstone entries and re-add deleted markers to the pin list if they were still in any local draft cache.

---

### Bug 3 — Frontend: Fire-and-Forget Delete (No Error Rollback)
**File:** `web/src/store/overlayStore.ts`, function `deleteMarker`

The function removed the marker from `usePinStore` optimistically, then called `api.markers.deleteMarker(id)` in a `try/catch` that only did `console.warn` on failure — it **did not roll back** the removal from `usePinStore`. This left the marker in a permanently false "deleted" visual state on the current client if the API failed, while the backend still had the record.

`markerStore.deleteMarker` had a rollback, but did not write to the tombstone on success or clean up the tombstone on rollback.

---

## Exact Fix Applied

### 1. Backend — Broadcast `marker_deleted` after commit
**`backend/routes/markers.py`**
- Added `BackgroundTasks` parameter to `delete_marker`
- After `await db.commit()`, enqueued a `manager.broadcast(project_id, {"type": "marker_deleted", "marker_id": ..., "session_id": ...})` background task
- Fetches `project_id` from the session record before deleting the marker

### 2. Frontend — Preserve Tombstone Across Cleanups
**`web/src/store/overlayStore.ts`, `performOneTimeCleanup`**
- Removed `localStorage.removeItem('stage_deleted_markers_v3')` from the cleanup routine
- The v3 tombstone is now the persistent, durable source of truth for deletions that must survive page refreshes

### 3. Frontend — Full Rollback on Delete Failure
**`web/src/store/overlayStore.ts`, `deleteMarker`**
- Captures snapshots of `prevPins`, `prevMarkers`, `prevFiltered` before optimistic removal
- Tombstone is written **before** the API call (so reconciliation can't restore during the in-flight window)
- On API failure: restores `usePinStore` and `useMarkerStore` from snapshots, removes the id from tombstone, and **re-throws** so the UI caller can show an error

**`web/src/store/markerStore.ts`, `deleteMarker`**
- Writes to tombstone before the API call
- On rollback: removes from tombstone and re-throws

---

## Before / After Behavior

| Scenario | Before | After |
|---|---|---|
| Delete marker, refresh | Marker reappears | Marker stays deleted |
| Delete on client A, client B sees it | Client B must manually refresh | Client B immediately removes marker via WS event |
| Delete API call fails | Marker permanently hidden on current client, still in DB | Marker is restored in the UI, error is surfaced |
| Reconnect after offline, marker was deleted while offline | Marker fetched and re-shown (tombstone may have been wiped) | Tombstone persists, marker filtered out during hydration |

---

## Manual Verification Checklist

- [ ] **Basic persistence**: Delete a marker as a developer. Refresh the page. Confirm the marker is gone.
- [ ] **Cross-client live sync**: Open the same session in two browser windows. Delete a marker from window A. Confirm window B removes it within 1-2 seconds without refreshing.
- [ ] **Failed delete (no rollback regression)**: Using browser DevTools → Network tab, block requests to `/markers/*`. Click delete. Confirm the marker reappears in the UI and an error message is shown.
- [ ] **Reconnect reconciliation**: Open a session. Go offline (DevTools → Network → Offline). Delete a marker from a second client. Come back online. Confirm the disconnected client does NOT show the deleted marker after reconnecting and reconciling.
- [ ] **Draft markers**: Create a marker but do not submit it (draft state). Delete it. Refresh. Confirm it does not reappear (draft deletion is local-only, no backend call).

---

## Ownership Check Status
The `Marker` model does not currently have a `creator_id` field. No ownership check was implemented. This is noted as a **follow-up task**: add `creator_id` to the `Marker` model via Alembic migration and enforce at the delete endpoint.
