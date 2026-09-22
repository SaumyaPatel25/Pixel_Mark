# Mobile Session Canvas Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a seamless, touch-native, uncluttered mobile viewing and pin-marking experience on STAGE session canvases for clients and developers.

**Architecture:** Enhance `backend/static/stage-agent.js` with multi-touch pinch shields, 500ms haptic long-press capture, and mobile responsiveness heuristics. Refactor `AuditSurface.tsx` and `MarkerPinLayer.tsx` with a bottom floating thumb-bar, Framer Motion mobile bottom sheet, 1280px scaled desktop view mode, and smart advisory banner.

**Tech Stack:** Next.js 16 (React 19, Tailwind CSS v4, Framer Motion, Lucide React), Vanilla JavaScript (`stage-agent.js`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-mobile-session-canvas-optimization-design.md`

## Global Constraints
- Target screen widths: `< 768px` (mobile smartphones, 375px to 430px).
- Zero pin creation during multi-touch pinch or two-finger scroll gestures.
- Touch tap drift threshold: 18px for `pointerType === 'touch'`.
- Preserve existing desktop behavior 100% when viewed on desktop browsers.
- No breaking changes to existing REST or WebSocket APIs.

---

### Task 1: Multi-Touch Shield & Long-Press Detection in `stage-agent.js`

**Files:**
- Modify: `backend/static/stage-agent.js`
- Test: `backend/tests/test_stage_agent_mobile.py` (or manual node validation script)

**Interfaces:**
- Consumes: Pointer events (`pointerdown`, `pointermove`, `pointerup`, `touchstart`, `touchend`, `touchmove`).
- Produces: `STAGE_CAPTURE_COORDINATES` postMessage payload with haptic feedback on hold.

- [ ] **Step 1: Inspect and update pointer listeners in `stage-agent.js`**
  - Add active touch tracking `activeTouchesCount`.
  - In `pointerdown` / `touchstart`:
    - If `e.touches && e.touches.length >= 2`, abort any pending long-press or tap candidate.
    - If in Browse mode (`!feedbackModeActive`) and `pointerType === 'touch'`, start a 500ms `longPressTimer`.
    - If held for 500ms within 12px drift, trigger `navigator.vibrate?.(40)` and execute `handleFeedbackCapture(e)`.
  - In `pointermove` / `touchmove`:
    - If movement > 12px or `touches.length >= 2`, cancel `longPressTimer`.
  - In `pointerup`:
    - For `pointerType === 'touch'`, allow drift up to 18px (vs 6px for mouse).

- [ ] **Step 2: Verify `stage-agent.js` syntax and bundle integrity**

---

### Task 2: Non-Mobile Site Detection Heuristic in `stage-agent.js`

**Files:**
- Modify: `backend/static/stage-agent.js`

**Interfaces:**
- Produces: `STAGE_SITE_NOT_MOBILE_OPTIMIZED` message sent to `window.parent`.

- [ ] **Step 1: Add responsiveness check function**
  - Inspect `document.querySelector('meta[name="viewport"]')`.
  - Check if viewport meta is missing or does not include `width=device-width`.
  - Check if `document.documentElement.scrollWidth > window.innerWidth * 1.25`.
  - If conditions met on a mobile viewport (`window.innerWidth < 768`), post `STAGE_SITE_NOT_MOBILE_OPTIMIZED` with `{ scrollWidth, windowWidth, hasMetaViewport }`.

---

### Task 3: Uncluttered Mobile Chrome & Floating Thumb Bar in `AuditSurface.tsx`

**Files:**
- Modify: `web/src/components/audit/AuditSurface.tsx`

**Interfaces:**
- Consumes: Screen dimensions (`window.innerWidth < 768`), `feedbackModeActive`.
- Produces: Clean mobile header + floating bottom thumb bar (`Browse` / `Comment` toggle, View Mode toggle, Pins pill).

- [ ] **Step 1: Detect mobile screen state in `AuditSurface.tsx`**
  - Add `isMobileViewport` detection (`window.innerWidth < 768`).
  - Collapse / streamline top toolbar when `isMobileViewport` is true.

- [ ] **Step 2: Implement Floating Bottom Thumb Bar**
  - Render a glassmorphism floating bar at bottom with safe-area spacing:
    - Mode toggle pill: `Browse` (finger scroll icon) vs `Comment` (pin/zap icon).
    - View mode pill: `Mobile 📱` vs `Desktop 💻`.
    - Pins counter pill: `💬 Pins (N)` that triggers feedback sheet.

---

### Task 4: Mobile Bottom Sheet for Feedback Submission

**Files:**
- Modify: `web/src/components/audit/AuditSurface.tsx`

**Interfaces:**
- Consumes: `isDrawerOpen`, `captureCtx`, `activeMarker`.
- Produces: Mobile bottom sheet drawer with touch drag-to-dismiss and thumb-friendly fields.

- [ ] **Step 1: Add responsive bottom sheet styling to feedback drawer**
  - When `isMobileViewport` is true, render drawer as a fixed bottom sheet (`fixed inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl`).
  - Add drag indicator bar at top for swipe-down dismiss.
  - Optimize input padding and font sizes (min 16px to prevent iOS Safari auto-zoom).

---

### Task 5: Desktop View on Mobile (1280px Scaled Mode)

**Files:**
- Modify: `web/src/components/audit/AuditSurface.tsx`
- Modify: `web/src/components/audit/MarkerPinLayer.tsx`

**Interfaces:**
- Consumes: `mobileDesktopMode` toggle state (`'mobile'` | `'desktop'`).
- Produces: Scaled 1280px iframe with coordinated pin placement scaling.

- [ ] **Step 1: Implement container scale transform in `AuditSurface.tsx`**
  - If `isMobileViewport` and `viewMode === 'desktop'`:
    - Container sets fixed width `1280px`.
    - `scaleFactor = containerWidth / 1280`.
    - `style={{ width: 1280, height: containerHeight / scaleFactor, transform: `scale(${scaleFactor})`, transformOrigin: 'top left' }}`.

- [ ] **Step 2: Synchronize pin coordinates in `MarkerPinLayer.tsx`**
  - Pass `scaleFactor` or coordinate translation to `MarkerPinLayer` so pins render precisely over target elements in scaled mode.

---

### Task 6: Smart Non-Mobile Advisory Banner

**Files:**
- Modify: `web/src/components/audit/AuditSurface.tsx`

**Interfaces:**
- Consumes: `STAGE_SITE_NOT_MOBILE_OPTIMIZED` message event.
- Produces: Dismissible advisory banner offering one-click switch to Desktop View.

- [ ] **Step 1: Add listener and state for `siteNotMobileOptimized`**
  - Render banner: *"This site is designed for desktop screens."*
  - Actions: `[Switch to Desktop View]` (activates Desktop View mode) and `[Dismiss]`.

---

### Task 7: Build & Regression Verification

**Files:**
- All modified files

- [ ] **Step 1: Run frontend build verification**
  - `cd web && npm run build` to confirm 0 TypeScript / Turbopack build errors.
- [ ] **Step 2: Test pin placement, gesture filtering, and mode toggling**
