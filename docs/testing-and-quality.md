# Testing and Quality Assurance

This document details the test suites, execution commands, coverage gaps, and manual QA validation steps for PixelMark.

---

## 1. Automated Testing Setup

### 1.1 Backend Test Suite (Pytest)
- **Framework**: `pytest` and `pytest-asyncio`.
- **Database Strategy**: Tests use an isolated test SQLite database. Async connections are mocked to prevent contamination of the development database.
- **Mocking Contexts**: Mock credentials and token verification are defined in `backend/tests/conftest.py`.
- **Run Commands**:
  Activate virtual environment inside `/backend/` and run:
  ```bash
  # Execute all tests
  pytest
  
  # Run a specific test file
  pytest tests/test_markers.py
  
  # Run tests with stdout output
  pytest -s
  ```

### 1.2 Frontend Test Suite (Vitest)
- **Framework**: `vitest`.
- **Component Testing**: Component rendering tests are structured using `@testing-library/react`.
- **Mocking Stores**: Zustand stores are reset before each test loop in setup scripts to ensure clean states.
- **Run Commands**:
  Navigate to the `/web/` directory and run:
  ```bash
  # Run interactive unit test runner
  npm run test
  
  # Execute one-off test run
  npx vitest run
  ```

---

## 2. Code Quality and Coverage Gaps
- **Horizontal Scaling Realtime Test**: The multi-instance synchronization loop utilizing Redis Pub/Sub lacks automated integration coverage.
- **IFrame Parsing and Rewriting Coverage**: Although unit tests verify relative link rewrites, they do not test complex edge cases like Shadow DOM script injections or CORS redirect headers.
- **Authentication Token Expiry**: Frontend tests do not verify expiration transitions or redirect loops if session validation fails.

---

## 3. Manual QA Playbook

### 3.1 Onboarding Tour Auto-Start Playbook
1. Clear browser storage (Run `localStorage.clear()` in DevTools Console).
2. Open the Login page (`http://localhost:3000/login`).
3. Click "Sign Up" and register a new account with a new email address (e.g. `fresh_dev_5678@test.com`).
4. **Validation Check**: Upon redirection to the dashboard page `/dashboard`, the "Welcome to PixelMark! 🚀" onboarding tour overlay should automatically open.

### 3.2 Visual Pin-Dropping Playbook
1. Open the project canvas for an active project.
2. Hold down the `Alt` key and click on a heading on the audited page inside the iframe.
3. Verify that a comment dialog drawer opens.
4. Input details (Title: `Heading spacing`, Description: `Margin bottom is too small`) and click "Save Pin".
5. **Validation Check**: Verify that a colored dot (pin) with the issue priority color appears at the click location, and that the comment feed displays the new issue in the sidebar.

### 3.3 WebSocket Real-time Sync Playbook
1. Open two separate browser windows (or one normal window and one incognito window) on the same project canvas.
2. Sign in with two separate accounts (or invite a client reviewer to the session).
3. In Window A, move the mouse cursor across the canvas.
4. **Validation Check**: Verify that a floating cursor overlay labeled with User A's name appears and moves in real-time in Window B.
5. In Window A, place a new visual feedback pin.
6. **Validation Check**: Verify that the new pin instantly renders in Window B without requiring a page refresh.
