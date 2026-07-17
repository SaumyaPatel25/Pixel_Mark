# ADR-002: Scroll Lag Mitigation Throttling

- **Date**: 2026-07-14
- **Status**: Accepted

---

## 1. Context
Floating particles and cards on the marketing hero screen (`HeroSection.tsx`) were causing rendering lag during page scrolls, leading to frame drops. Floating transformations were competing with browser rendering threads during scrolls.

---

## 2. Decision
Implement scroll-aware animation throttling:
1. Detect scroll events using a global scroll listener on mounting.
2. Disable floating animations immediately on scroll detection by setting an active flag (`isScrolling` is true).
3. Throttle/debounce resumption of floating animations: wait 150ms after scroll halts before enabling animations again.
4. Avoid using CSS `will-change` promotions which cause high VRAM thrashing on mobile viewports.

---

## 3. Consequences
- **Pros**:
  - Smooth page scroll performance with zero frame drops.
  - Reduced VRAM utilization.
- **Cons**:
  - Animations pause temporarily while scrolling.
- **Code Impact**: Modifies `web/src/components/marketing/HeroSection.tsx`.
