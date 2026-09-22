# Mobile Session Canvas Optimization & Touch Pin Specification

- **Date**: 2026-09-21
- **Status**: Approved
- **Architectural Scope**: Frontend (`web/src/components/audit/`, `web/src/app/project/`, `web/src/app/review/`) & Injected Agent (`backend/static/stage-agent.js`)

---

## 1. Overview & Objective

Enable clients and developers to open STAGE review links (`/project/[id]`, `/review/[token]`) on mobile smartphones (iOS Safari, Android Chrome) with a clean, touch-native, clutter-free experience. Users must be able to smoothly scroll, pinch-to-zoom, drop pins either via Comment Mode or Long-Press in Browse Mode, view feedback in a mobile bottom sheet, switch to Desktop View on mobile, and receive smart suggestions when a target website is not mobile-optimized.

---

## 2. Core Architectural Components

### 2.1 Injected Reviewer Agent (`backend/static/stage-agent.js`)
1. **Touch & Multi-Touch Guarding**:
   - Filter all pinch-to-zoom gestures (`e.touches.length >= 2`). Never register a pin candidate while zooming or two-finger scrolling.
   - Expand touch drift tolerance from 6px (desktop mouse) to 18px for `pointerType === 'touch'` to accommodate natural thumb pad wobble.
2. **Long-Press Detector (Browse Mode)**:
   - 500ms timer on `pointerdown` / `touchstart`.
   - If user holds position within 12px for 500ms, trigger haptic pulse `navigator.vibrate?.([40])` and fire `handleFeedbackCapture`.
   - Cancel timer if movement exceeds drift threshold or second touch point is detected.
3. **Non-Mobile Heuristic Detection**:
   - Check `<meta name="viewport">` for `width=device-width`.
   - Check `document.documentElement.scrollWidth > window.innerWidth * 1.2` or hardcoded desktop min-widths >= 900px.
   - Post `STAGE_SITE_NOT_MOBILE_OPTIMIZED` to parent frame.

### 2.2 Mobile Chrome & Floating Thumb Bar (`web/src/components/audit/AuditSurface.tsx`)
1. **Compact Mobile Top Bar**:
   - Minimize height to 44px on mobile devices (`< 768px`).
   - Show only Back, Project Name, Page Pill, and Share button.
   - Hide desktop-specific tools (Alt+Click switch, Blueprint canvas editor switch, detailed style inspector panels).
2. **Floating Bottom Thumb Bar**:
   - Anchored at bottom with safe-area padding (`pb-safe`).
   - Quick Mode Toggle: `Browse` (pass-through scrolling + long-press pin drop) vs `Comment` (single-tap pin drop).
   - View Mode Switcher: `[Mobile 📱 / Desktop 💻]`.
   - Feedback Count Pill: `💬 Pins (N)` opens Mobile Feedback Sheet.
3. **Mobile Bottom Sheet for Feedback Form**:
   - Bottom sheet replaces floating desktop modal when `isMobile` is true.
   - Framer Motion spring physics with drag handle to dismiss.
   - Thumb-friendly inputs with safe spacing for on-screen mobile keyboard.

### 2.3 Desktop View Mode on Mobile (`AuditSurface.tsx` + `MarkerPinLayer.tsx`)
1. In Desktop View mode on mobile screens, iframe width is set to `1280px` and scaled via `transform: scale(scaleFactor)`.
2. `MarkerPinLayer` applies the identical scale transform so pins stay pixel-anchored.
3. Pinch-to-zoom operates smoothly on the scaled container without triggering pin placement.

### 2.4 Smart Non-Mobile Advisory Banner
1. Floating banner at top of canvas when `STAGE_SITE_NOT_MOBILE_OPTIMIZED` is received.
2. Offers one-tap `[Switch to Desktop View]` or `[Dismiss]`.

---

## 3. Verification & Testing Strategy
1. **Unit & Build Testing**:
   - `npm run build` in `web/` to verify zero TypeScript or syntax regressions.
   - Run existing vitest / jest suites.
2. **Touch & Gesture Verification**:
   - Verify single tap in Comment Mode drops pin.
   - Verify long-press in Browse Mode drops pin.
   - Verify 2-finger pinch-to-zoom does NOT drop pins.
   - Verify Desktop View toggle scales target site and pins correctly.
   - Verify non-responsive site banner triggers appropriately.
