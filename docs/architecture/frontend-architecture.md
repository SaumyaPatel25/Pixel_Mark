# Frontend Architecture

This document details the client-side system architecture, page routes, state management pattern, and interactive components.

---

## 1. Routing and Page Structure
STAGE uses **Next.js 16 (App Router)**. It is organized into several layout groups to cleanly segregate page boundaries:

```
web/src/app/
├── (auth)/                    # Gated Authentication routes
│   ├── login/                 # Sign In form
│   ├── register/              # Sign Up/Workspace Initialization form
│   ├── forgot-password/       # Request email reset link
│   ├── reset-password/        # Update user password
│   ├── verify-email/          # Token verification target
│   └── auth/oauth-callback/   # GitHub redirect handshake resolver
├── (dashboard)/               # Core developer workspace layouts
│   ├── dashboard/             # Projects list & aggregate metric widgets
│   ├── sessions/              # List of active review sessions
│   ├── sessions/[id]/         # Session stats & audit reports panel
│   └── canvas/[projectId]/    # Canvas layout board
├── (public)/                  # Shared reports page
│   └── report/[sessionId]/    # Print-ready QA reports for clients
├── faq/                       # Standalone FAQ page
├── features/                  # Standalone Features/Workflow page
├── project/[id]/              # Main interactive review overlay (Developers)
├── review/[token]/            # Main interactive review overlay (Clients)
├── support/diagnostics/       # Client connectivity diagnostics panel
└── t/[token]/                 # Short link redirect target
```

- **App Entry Point**: `web/src/app/layout.tsx` (loads global styles `globals.css` and sets base HTML shell).
- **Layout Guards**: `web/src/app/(dashboard)/layout.tsx` wraps pages in `<DashboardLayoutClient>` which checks `stagetoken` cookies. If absent, it redirects to `/login`.

---

## 2. Component Architecture & Hierarchy
The developer workspace is structured into nested containers:

```
[ProjectPage /project/id]
 ├── <Header> (Project details, Sync indicator, View switcher)
 └── [Main Substrate]
      ├── <DesignSystemPanel> (Left overlay: visual styles drawer)
      ├── <FeedbackAnalyticsPanel> (Left overlay: metrics chart)
      ├── <AuditSurface> (Core center canvas)
      │    ├── <ScreenshotPermissionBanner> (Prompts captures access)
      │    ├── <PageTabBar> (Iframe subpages navigation bar)
      │    ├── <IFrame> (Loads proxy endpoint /proxy/session/{id})
      │    ├── <MarkerPinLayer> (Renders list of interactive absolute dots)
      │    └── <RegionSelectionOverlay> (Provides crop selector tools)
      └── <FeedbackFeed> (Right sidebar: comments feed)
```

---

## 3. Zustand State Management
STAGE isolates UI views, authentication status, and API sync states into dedicated, micro-state Zustand stores under `web/src/store/`:

1. **useAuthStore**:
   - Manages token cookies (`stagetoken`), active profile fetching, and registers users.
   - Persists state using local storage middleware (`name: 'stage_auth'`).
   - *Evidence: web/src/store/authStore.ts*
2. **useMarkerStore**:
   - Stores the authoritative list of feedback pins (`markersById`), selection IDs, and active filters.
   - Implements **optimistic UI operations**: inserts temporary elements locally and makes REST calls to `/markers/`, rolling back to cached copies if calls fail.
   - Digests WebSocket events (`marker_created`, `presence_updated`) to synchronize the state.
   - *Evidence: web/src/store/markerStore.ts*
3. **useOnboardingStore**:
   - Configures interactive user-tour flows (`developerSteps`, `reviewerSteps`).
   - Hydrates and updates progress checklist items inside `localStorage` under `pm_onboarding_state`.
   - *Evidence: web/src/store/onboardingStore.ts*
4. **useProjectStore**:
   - Fetches and stores projects lists.
   - *Evidence: web/src/store/projectStore.ts*
5. **useUIStore**:
   - Tracks sidebar drawers collapse toggles (`isCommandCenterOpen`, `isExportPanelOpen`, etc.) and pushes notification toasts.
   - *Evidence: web/src/store/uiStore.ts*
6. **useSessionStore**:
   - Tracks session-level rendering metadata (heavy mode, renderer types).
   - *Evidence: web/src/store/sessionStore.ts*

---

## 4. Data-Fetching Strategy
- **API Client**: Implemented in `web/src/lib/api.ts` (exports `api` dictionary). 
- **Request Queue (`apiQueue.ts`)**: Prevents race conditions by enqueuing read/write requests.
- **Dynamic Gating**: `DashboardLayoutClient` uses a reactive sequence to block UI rendering until `fetchMe()` resolves, followed by `fetchProjects()`.
- **Preventing Cache Stalling**: API calls use `cache: 'no-store'` in fetch configurations to ensure Next.js never caches dynamic API responses.

---

## 5. Forms and Input Validation
- Forms (such as Login, Registration, and Project Creation) manage states via React hooks.
- **Error Handling**: API errors are caught, parsed (automatically formatting list-based Pydantic validation errors), and surfaced to the UI.
- **Draft Persistence**: Feedback forms in `AuditSurface.tsx` save changes in real-time to `localStorage` under `stage_current_draft_form`, ensuring users do not lose comments on network drops or refreshes.

---

## 6. Accessibility & UX considerations
- **Focus Management**: Opening the `<FeedbackFeed>` drawer shifts focus to the textarea automatically, and closing it returns focus to the trigger button.
- **Keyboard Navigation**: Pressing `Escape` closes active drawer overlays.
- **Alt + Click shortcut**: Users can hold `Alt` and click anywhere on the canvas to place a feedback pin.
- **Loaders**: `<StageLoader>` provides full-viewport animated loading states during initial hydration.

---

## 7. Performance Optimizations

### GPU VRAM Thrashing Prevention
- In the hero floating effects (`web/src/components/marketing/HeroSection.tsx`), massive GPU will-change promotions are avoided.
- A scroll-aware throttling listener disables floating float animations during page scrolls to preserve CPU cycles, debouncing resumption by 150ms.

### Optimistic UI Rendering
- Creation, position movement, and deletion of pins update Zustand states immediately. Network requests run asynchronously in the background. If they fail, the state rolls back to the previous snapshot.
