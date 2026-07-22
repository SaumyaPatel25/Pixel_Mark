# 16 Test Plan and Gap Analysis

This document outlines the current testing footprint and identifies the most critical gaps that must be closed before declaring production readiness.

## Existing Tests Found
- `verify_suite.py` / `verify_suite_final.py`: Massive, monolithic Python E2E integration scripts that stand up a local test client to simulate the backend API flow (Register -> Create Project -> Create Session -> Drop Marker -> Generate Share Link).
- `e2e_test.py`: Similar to the verify suites but potentially older.
- `backend_e2e_tests.py` / `backend_test_phase_1.py`: Various iterations of test runners.

## What They Cover
- Backend CRUD logic.
- Token generation logic.
- Basic schema validation (verifying 200 OKs vs 422 Unprocessable Entity).

## Missing Test Areas (The Gaps)

### 1. Frontend Unit & Component Tests
- **Gap:** Zero visible usage of Jest or React Testing Library in the `web/` directory.
- **Risk:** Frontend UI states (like Zustand marker stores) break silently during refactors.
- **Required:** Tests for `ProjectCard.tsx`, `apiQueue.ts` logic, and the `Canvas` rendering loop.

### 2. Playwright / Frontend E2E Tests
- **Gap:** No headless browser tests.
- **Risk:** The core product feature (injecting an iframe over an external site and dropping a pin) is completely untested by automation.
- **Required:** Playwright tests that boot up the Next.js app, navigate to a session, simulate a cross-origin iframe click, and verify the `DOMEdit` or `Marker` is saved.

### 3. WebSocket Integration Tests
- **Gap:** The existing Python scripts test REST endpoints but do not spin up an async WebSocket client to verify broadcast capabilities.
- **Risk:** WS connection pooling bugs and memory leaks go undetected until production crashes.
- **Required:** `pytest-asyncio` tests that connect two simulated clients to the same session, send a marker update from Client A, and assert Client B receives the exact JSON payload.

### 4. Regression Tests for Marker Math
- **Gap:** No tests for `stage-agent.js` coordinate functions.
- **Risk:** Every attempt to fix coordinate drift breaks a different edge case.
- **Required:** Unit tests specifically for `normalizeMarkerCoordinates` feeding in various mock screen sizes and scrolling offsets.

---
- **Confidence Level:** High
- **Evidence Source:** Foundational knowledge of standard QA practices mapped against the `tests/` directory files.
- **Next File to Read:** `17-open-questions-and-risks.md`
