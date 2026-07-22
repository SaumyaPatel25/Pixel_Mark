# STAGE Marker V2 Rebuild Documentation

We have successfully rebuilt the STAGE marker system in a staging, fully isolated V2 architecture. This replaces the legacy, overly complex marker implementation with a decoupled, predictable, and robust contract.

## Legacy Issues Identified
1. **Aggressive Cache Invalidation Gaps:** The Next.js Router Cache was dynamically caching GET requests on reload, serving stale marker data even after it was successfully deleted in the DB.
2. **WebSocket Sync Duplication:** The system maintained two desynced frontend stores (`useMarkerStore` and `usePinStore`/`useCaptureStore`), causing pins to remain "sticky" on the UAT canvas even when deleted from the sidebar.
3. **Bloated Schema:** The legacy `Marker` model acted as a generic JSON dump for elements, screenshots, bounding boxes, and console errors, increasing the likelihood of schema drift.

---

## Canonical Marker V2 Contract
```typescript
type MarkerV2 = {
  id: string
  session_id: string
  creator_id: string | null
  creator_name: string | null
  creator_role: 'developer' | 'reviewer' | null
  x: number
  y: number
  page_url: string | null
  note: string
  status: 'open' | 'resolved'
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

---

## Files Changed

### Backend (FastAPI / SQLAlchemy)
*   **Model:** `MarkerV2` appended to [core.py](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/backend/models/core.py)
*   **Schemas:** Created [markers_v2.py](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/backend/schemas/markers_v2.py) containing Pydantic schemas.
*   **Routes:** Created [markers_v2.py](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/backend/routes/markers_v2.py) mounted under `/v2/` namespace in [main.py](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/backend/main.py).
*   **Migrations:** Generated [aa1d8e603fda_add_markers_v2.py](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/backend/alembic/versions/aa1d8e603fda_add_markers_v2.py) containing explicit DDL to prevent startup-time mutation drift.

### Frontend (Next.js / Zustand)
*   **API Client:** Created [apiV2.ts](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/web/src/lib/apiV2.ts) and exported `request` in [api.ts](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/web/src/lib/api.ts).
*   **Zustand Store:** Created [markerV2Store.ts](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/web/src/store/markerV2Store.ts) as the single source of truth for V2.
*   **WebSocket Hook:** Created [useSessionSocketV2.ts](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/web/src/lib/useSessionSocketV2.ts) ensuring all socket updates trigger a debounced REST sync (collapsing burst events within 200ms to prevent refetch storms).
*   **Isolated Session Dashboard:** Created [page.tsx](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/web/src/app/(dashboard)/v2/sessions/[id]/page.tsx) with a minimal layout for CRUD operations and a clickable viewport mockup.

---

## Manual QA Checklist

### 1. Persistent Create Marker
*   Go to `http://localhost:3000/v2/sessions/{session_id}`.
*   Click inside the viewport preview box to select coordinates.
*   Add a note and click **Drop Marker**.
*   Verify the marker appears in the list and plots as a pin on the canvas.
*   Reload the page. Verify the marker persists and remains plotted.

### 2. Persistent Update Marker
*   Click the **Toggle Status** check icon on a marker.
*   Verify the status changes (color shifts on the canvas from blue to green).
*   Edit the note text and save.
*   Reload the page. Verify all edits persist.

### 3. Persistent Delete Marker
*   Click the **Trash** icon on a marker.
*   Verify the marker disappears from the list and the canvas.
*   Reload the page. Verify it does not reappear.

### 4. WebSocket Sync & Refetch
*   Open the same V2 session page in two separate browser windows.
*   Create, update, or delete a marker in Window 1.
*   Verify that Window 2 immediately updates in real-time.
