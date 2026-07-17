# ADR-001: Onboarding Tour Auto-Start Gating

- **Date**: 2026-07-12
- **Status**: Accepted

---

## 1. Context
The "Get Started" product tour onboarding overlay is designed to guide new developers. However, it was not starting automatically for new accounts or accounts with zero projects. The check was running before the user profile session and project list had resolved, resulting in race conditions.

---

## 2. Decision
Implement strict state-gating guards within `DashboardLayoutClient.tsx`:
1. Wait until user session is resolved (`isLoading` is false and `user` is populated).
2. Wait until projects list is fully resolved (`projectsFetched` is true and `projectsLoading` is false).
3. Confirm onboarding is not already active, completed, or dismissed (`isOnboardingActive || isCompleted || isDismissed`).
4. Trigger the onboarding flow if they have zero projects (`projects.length === 0`).
5. Introduce a `setTimeout` delay of 500ms before starting the tour to ensure the layout completes rendering.

---

## 3. Consequences
- **Pros**:
  - Solves the race condition, ensuring new developers see the tour when they register.
  - Prevents the tour from popping up for existing users with projects.
- **Cons**:
  - Adds dependency on the timing of multiple async calls (`fetchMe`, `fetchProjects`).
- **Code Impact**: Modifies `web/src/app/(dashboard)/DashboardLayoutClient.tsx`.
