# STAGE Browser E2E Verification Report

**Execution Timestamp**: 2026-06-11 01:10:34 
**Environment**: Local (Next.js @ http://localhost:3000, FastAPI @ http://localhost:8765)

## 1. Overall Summary
- **Total Audited Sites**: 6
- **PASS**: 0
- **PASS WITH WARNINGS**: 0
- **FAIL**: 6

### Top 3 Systemic Issues Identified
1. N/A
2. N/A
3. N/A

## 2. Per-Site Verification Results

### OpinVox (https://opinvox.entrext.com/)
- **Status**: **FAIL**
- **Render Quality & Visual Stability**: Initial state
- **Drawer Navigation Action**: Drawer CRASHED or FAILED
- **Internal Navigations (Iframe)**: Completed 0 / 3 (None)
- **Guest Review Form & 3 Markers Placement**: No
- **WebSocket Live Sync**: Failed to sync
- **Console Logs Audit**:
  - Errors: None
  - Hydration Warnings: None
- **Proxy Network Verification**:
  - Google Analytics Tags detected: 0
  - Bypassed proxy server successfully: 0 / 0
  - Critical Asset load failures: None
- **Site Screenshots**:
  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/opinvox_iframe.png)
  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/opinvox_command_center.png)
  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/opinvox_guest_review.png)
- **Critical Failures**:
  - ❌ Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================
- **Root Cause Category**: Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect
- **Next Recommended Fix**: Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection

### Next.js (https://nextjs.org)
- **Status**: **FAIL**
- **Render Quality & Visual Stability**: Initial state
- **Drawer Navigation Action**: Drawer CRASHED or FAILED
- **Internal Navigations (Iframe)**: Completed 0 / 3 (None)
- **Guest Review Form & 3 Markers Placement**: No
- **WebSocket Live Sync**: Failed to sync
- **Console Logs Audit**:
  - Errors: None
  - Hydration Warnings: None
- **Proxy Network Verification**:
  - Google Analytics Tags detected: 0
  - Bypassed proxy server successfully: 0 / 0
  - Critical Asset load failures: None
- **Site Screenshots**:
  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/next.js_iframe.png)
  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/next.js_command_center.png)
  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/next.js_guest_review.png)
- **Critical Failures**:
  - ❌ Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================
- **Root Cause Category**: Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect
- **Next Recommended Fix**: Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection

### Vercel (https://vercel.com)
- **Status**: **FAIL**
- **Render Quality & Visual Stability**: Initial state
- **Drawer Navigation Action**: Drawer CRASHED or FAILED
- **Internal Navigations (Iframe)**: Completed 0 / 3 (None)
- **Guest Review Form & 3 Markers Placement**: No
- **WebSocket Live Sync**: Failed to sync
- **Console Logs Audit**:
  - Errors: None
  - Hydration Warnings: None
- **Proxy Network Verification**:
  - Google Analytics Tags detected: 0
  - Bypassed proxy server successfully: 0 / 0
  - Critical Asset load failures: None
- **Site Screenshots**:
  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/vercel_iframe.png)
  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/vercel_command_center.png)
  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/vercel_guest_review.png)
- **Critical Failures**:
  - ❌ Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================
- **Root Cause Category**: Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect
- **Next Recommended Fix**: Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection

### Stripe (https://stripe.com)
- **Status**: **FAIL**
- **Render Quality & Visual Stability**: Initial state
- **Drawer Navigation Action**: Drawer CRASHED or FAILED
- **Internal Navigations (Iframe)**: Completed 0 / 3 (None)
- **Guest Review Form & 3 Markers Placement**: No
- **WebSocket Live Sync**: Failed to sync
- **Console Logs Audit**:
  - Errors: None
  - Hydration Warnings: None
- **Proxy Network Verification**:
  - Google Analytics Tags detected: 0
  - Bypassed proxy server successfully: 0 / 0
  - Critical Asset load failures: None
- **Site Screenshots**:
  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/stripe_iframe.png)
  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/stripe_command_center.png)
  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/stripe_guest_review.png)
- **Critical Failures**:
  - ❌ Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================
- **Root Cause Category**: Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect
- **Next Recommended Fix**: Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection

### Framer (https://www.framer.com)
- **Status**: **FAIL**
- **Render Quality & Visual Stability**: Initial state
- **Drawer Navigation Action**: Drawer CRASHED or FAILED
- **Internal Navigations (Iframe)**: Completed 0 / 3 (None)
- **Guest Review Form & 3 Markers Placement**: No
- **WebSocket Live Sync**: Failed to sync
- **Console Logs Audit**:
  - Errors: None
  - Hydration Warnings: None
- **Proxy Network Verification**:
  - Google Analytics Tags detected: 0
  - Bypassed proxy server successfully: 0 / 0
  - Critical Asset load failures: None
- **Site Screenshots**:
  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/framer_iframe.png)
  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/framer_command_center.png)
  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/framer_guest_review.png)
- **Critical Failures**:
  - ❌ Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================
- **Root Cause Category**: Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect
- **Next Recommended Fix**: Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection

### Linear (https://linear.app)
- **Status**: **FAIL**
- **Render Quality & Visual Stability**: Initial state
- **Drawer Navigation Action**: Drawer CRASHED or FAILED
- **Internal Navigations (Iframe)**: Completed 0 / 3 (None)
- **Guest Review Form & 3 Markers Placement**: No
- **WebSocket Live Sync**: Failed to sync
- **Console Logs Audit**:
  - Errors: None
  - Hydration Warnings: None
- **Proxy Network Verification**:
  - Google Analytics Tags detected: 0
  - Bypassed proxy server successfully: 0 / 0
  - Critical Asset load failures: None
- **Site Screenshots**:
  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/linear_iframe.png)
  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/linear_command_center.png)
  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/linear_guest_review.png)
- **Critical Failures**:
  - ❌ Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================
- **Root Cause Category**: Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect
- **Next Recommended Fix**: Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection

## 3. Cross-Site Bug List

### Critical Severity
- `[OpinVox] Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================`
- `[Next.js] Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================`
- `[Vercel] Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================`
- `[Stripe] Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================`
- `[Framer] Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================`
- `[Linear] Automation execution crashed: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/project/*" until 'load'
============================================================`

### Major Severity
- *None*

### Minor / Warning Severity
- *None*

## 4. Ship-Readiness Verdict
### Verdict: **NOT SHIP-READY**
The release contains critical failures (e.g. proxy visual rendering shells failing or crashes in drawer transitions) that block key user flows.
