# PixelMark Phase 0 — Universal Audit Data Model

Use this prompt first. It defines the data model that all later proxy, agent, UI, and WebGL work will depend on.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT 0.1 — UNIVERSAL AUDIT SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior backend architect rebuilding PixelMark from the core.

Goal:
Create a universal audit data model that supports:
- multi-page sessions,
- normal DOM websites,
- Shadow DOM websites,
- Canvas2D / WebGL / Three.js pages,
- screenshot storage,
- page-level navigation tracking,
- backward compatibility with the current production schema.

Project stack:
- FastAPI backend
- SQLAlchemy 2.0 async
- PostgreSQL in production
- SQLite fallback in local dev
- Pydantic v2 schemas

Task:
Update the backend models and schemas so PixelMark can store a complete audit graph, not just single-page markers.

Create or update these entities:

1) Session
Fields:
- id: UUID
- project_id: UUID foreign key
- title: string
- current_page_url: string nullable
- pages_visited_count: integer default 0
- created_at: datetime
- updated_at: datetime nullable

2) PageVisit
Fields:
- id: UUID
- session_id: UUID foreign key
- page_url: string
- page_title: string nullable
- renderer_type: enum/string with values:
  - dom
  - shadow_dom
  - canvas2d
  - webgl
  - threejs
  - unknown
- visited_at: datetime
- screenshot_url: string nullable
- metadata: JSON nullable

3) Marker
Fields:
- id: UUID
- session_id: UUID foreign key
- page_visit_id: UUID nullable foreign key to PageVisit
- page_url: string nullable
- page_title: string nullable
- renderer_type: enum/string
- marker_number: integer
- title: string nullable
- description: string nullable
- url: string nullable
- xpath: string nullable
- css_selector: string nullable
- inner_text: string nullable
- viewport: JSON nullable
- browser: string nullable
- os: string nullable
- scroll_position: JSON nullable
- console_errors: JSON nullable
- network_errors: JSON nullable
- canvas_context: JSON nullable
- screenshot_url: string nullable
- ai_summary: string nullable
- priority: string default "medium"
- status: string default "open"
- created_at: datetime
- updated_at: datetime nullable

4) Optional future-proof helper entity
RendererSnapshot or AuditArtifact
Fields:
- id: UUID
- session_id: UUID foreign key
- page_visit_id: UUID nullable
- kind: string
- payload: JSON
- created_at: datetime

Rules:
- Keep old records readable.
- If old marker rows do not have page_url or renderer_type, default them safely.
- Use JSONB in PostgreSQL and JSON in SQLite if needed.
- Add indexes on session_id, page_url, page_visit_id, created_at.
- Add unique constraint for marker_number per session.
- Ensure marker_number is auto-assigned sequentially within a session.
- Support migration or bootstrap creation without deleting existing data.

Update these Pydantic schemas:
- SessionCreate / SessionRead / SessionUpdate
- PageVisitCreate / PageVisitRead
- MarkerCreate / MarkerRead / MarkerUpdate
- SessionStatsRead
- PageGroupedMarkersRead

SessionStatsRead should include:
- total
- by_priority
- by_status
- by_renderer
- pages_visited
- unique_pages

PageGroupedMarkersRead should return a list of pages with markers grouped by page_url.

Output:
- updated SQLAlchemy models
- updated Pydantic schemas
- migration or bootstrap logic
- a brief compatibility summary
- no UI changes yet
