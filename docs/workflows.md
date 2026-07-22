# System Workflows

This document diagrams the execution paths for core STAGE features, tracing interactions from user click down to database commits.

---

## 1. Onboarding and Gated Project Initialization Workflow
Registers new accounts and triggers the product tour.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Front as DashboardLayoutClient
    participant Store as useOnboardingStore
    participant API as FastAPI REST Backend
    
    User->>Front: Access Dashboard Page
    Front->>API: GET /projects/
    API-->>Front: Return Project List (Empty Array)
    Front->>Front: Set projectsFetched = true
    Front->>Store: Check isDismissed, isCompleted
    Store-->>Front: false, false
    Note over Front: Wait 500ms (clear timeout)
    Front->>Store: startOnboarding('developer')
    Store->>Store: Set checklist items, isOnboardingActive = true
    Store->>Front: Show step 0 (Welcome Overlay)
```

---

## 2. Session Launch and recycling Workflow
Determines if an active session can be reused to reduce DB allocations.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Next.js Workspace
    participant SessionRoute as /sessions/ Router
    participant DB as SQLite / Neon DB

    User->>UI: Click "New Session"
    UI->>SessionRoute: POST /sessions/ (project_id)
    SessionRoute->>DB: Query session where project_id & status='active'
    alt Recent Session Exists (< 5 minutes ago)
        DB-->>SessionRoute: Returns existing session record
        Note over SessionRoute: Session Recycled (Avoid duplicate)
    else No Recent Session
        SessionRoute->>DB: Count org active sessions
        alt Session count > 3
            SessionRoute->>DB: Update oldest active session set status='closed'
        end
        SessionRoute->>DB: Insert new Session record
        SessionRoute->>DB: Create default CanvasFrame
    end
    DB-->>SessionRoute: Commit changes
    SessionRoute-->>UI: Return session JSON
```

---

## 3. Visual Pin-Dropping & Regional Capture Workflow
Highlights elements inside the sandboxed iframe and captures annotations.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frame as Proxy IFrame (DOM)
    participant Overlay as AuditSurface Overlay
    participant SDK as captureOrchestrator
    participant Store as useMarkerStore
    participant API as REST API Router
    participant DB as SQLite / Neon DB
    participant WS as WebSocket Broadcaster

    User->>Frame: Hold Alt + Click Element
    Frame->>Overlay: Catch Click Event (Selector, XPath, coordinates)
    Overlay->>Overlay: Show feedback input dialog
    User->>Overlay: Input issue description & click "Save Pin"
    Overlay->>SDK: orchestrateScreenshot(region/element)
    SDK->>Frame: Capture canvas viewport using postMessage
    Frame-->>SDK: Return Base64 dataUrl
    SDK-->>Overlay: Screenshot resolved
    Overlay->>Store: createMarkerViaApi(payload)
    Store->>Store: Optimistic local insert (Temp- ID)
    Store->>API: POST /sessions/{id}/markers (payload)
    API->>API: Resolve credentials (JWT or Share Token)
    API->>DB: Insert Marker record (version=1)
    DB-->>API: Commit successful
    API->>WS: Broadcast event type 'marker_created'
    API-->>Store: Return persistent Marker Model
    Store->>Store: Remove Temp- ID, insert authoritative Marker
    WS-->>Store: (Realtime WebSocket receives message, validates version, silences duplicates)
```

---

## 4. Real-time Cursor Coordinates Sync Loop
Sends client mouse moves across clustered servers.

```mermaid
sequenceDiagram
    autonumber
    actor Client A
    participant Manager A as ConnectionManager (Node A)
    participant Redis as Redis Pub/Sub Channel
    participant Manager B as ConnectionManager (Node B)
    actor Client B

    Client A->>Client A: Mouse Move on Canvas
    Client A->>Manager A: WS Send: type='CURSOR_MOVE'
    Manager A->>Redis: Publish payload to channel 'session:123'
    Redis-->>Manager B: Receive payload from channel 'session:123'
    Manager B->>Client B: WS Push: type='CURSOR_MOVE'
    Client B->>Client B: Update Client A cursor overlay in UI
```
