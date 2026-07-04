# 11 Feature Status Matrix

This matrix maps the intended features of PixelMark against their actual implementation status in the codebase.

| Feature | Intended Behavior | Backend Status | Frontend Status | Integration Status | Test Coverage | Prod Readiness | Notes |
|---------|-------------------|----------------|-----------------|--------------------|---------------|----------------|-------|
| Auth Register/Login/Logout | Developers can create accounts and securely login. | Working | Working | Working | High | Yes | Highly tested, but relies on local mock/JWT rather than OAuth. |
| OAuth Integration | Google/GitHub single sign-on. | Stubbed | Shell UI | Broken/Missing | None | No | UI buttons exist, but backend routes are incomplete. |
| Dashboard | View all projects and general stats. | Working | Working | Working | High | Yes | Recently fixed to respect `NEXT_PUBLIC_API_URL`. |
| Project CRUD | Create, List, Delete projects. | Working | Working | Working | High | Yes | Foundation is solid. |
| Session CRUD | Spawn specific review sessions per project. | Working | Working | Working | High | Yes | |
| Share Link Create/Access | Generate public URL for external reviewers. | Partial | Partial | Fragile | Low | No | Works locally, but routing loops and auth guards break in prod. |
| Reviewer Name Capture | Guest reviewers are asked for a name before dropping pins. | Missing | Shell | Missing | None | No | Anonymous fallback is currently the default. |
| Marker CRUD | Drop, move, and delete visual pins. | Working | Working | Buggy | Medium | No | The basic API works, but coordinate placement is notoriously bad. |
| Marker Status | Toggle pins between Pending/Done. | Working | Working | Working | Medium | Yes | |
| Reviewer Colors | Each unique reviewer gets a designated pin color. | Missing | Missing | Missing | None | No | |
| Coordinate Placement | Pins stay exactly where they were clicked regardless of screen size. | N/A | Buggy | Buggy | Low | No | Massive coordinate drift on resize. Needs DOM anchoring. |
| Exports (MD/CSV/JSON) | Download list of marker feedback. | Partial | Partial | Broken | Low | No | Backend logic exists but often throws 500s due to model changes. |
| WebSocket Live Sync | Real-time transmission of marker updates. | Working | Working | Fragile | Low | No | Memory-bound to single instance. Zombie connections prevalent. |
| Canvas / Command Center | The iframe viewer where developers see target sites. | Working | Working | Fragile | Medium | No | Highly vulnerable to CORS and framebusting by target sites (like Google). |
| AI Triage / Summary | Auto-categorize and summarize feedback using LLMs. | Stubbed | Shell | Missing | None | No | Ambitious roadmap feature, currently just API shells. |
| Deployment Health | Seamless transition from local dev to Vercel/Railway prod. | - | - | Broken | Low | No | Hardcoded localhost URLs and differing DB schemas cause frequent prod crashes. |

---
- **Confidence Level:** High
- **Evidence Source:** Aggregate knowledge from codebase inspection, recent bug fixes, and user logs.
- **Next File to Read:** `12-broken-missing-hardening.md`
