# STAGE — Product Requirement Specification (PRD)

*Generated via TestSprite & STAGE System Architecture*  
*Project Root*: `c:\Users\saumy\OneDrive\Desktop\Entrext`  
*Generated Date*: 2026-11-19

---

## 1. Product Overview
**STAGE** is an enterprise-grade collaborative visual review platform engineered for engineering, design, and product teams. It enables real-time auditing of live web applications via a secure proxy, interactive DOM-pinned annotations, authoritative AI-powered UX heuristics analysis, and seamless developer handoff.

---

## 2. Core Product Goals
1. **Interactive Element-Anchored Auditing**: Place high-precision feedback pins directly on DOM elements across responsive breakpoints without layout shifts.
2. **Senior AI Strategic Heuristics (No Minor Suggestions)**: Analyze entire site DOM fingerprints and generate authoritative, conversion-driving architectural improvements with design benchmark inspirations (Linear, Stripe, Apple, Vercel).
3. **Developer Handoff & Prompt Export**: Provide one-click copyable prompts formatted for Cursor, Claude Code, Windsurf, and Antigravity, including target selectors, directives, and JSX code specs.
4. **Realtime Multi-User Collaboration**: Live presence, spatial cursors, and instant marker synchronization over WebSocket & Redis Pub/Sub.
5. **Multi-Channel Webhook Dispatch**: Instant notification dispatch via rich Slack Block Kit cards, Discord embeds, and outbox event streams.
6. **Guest & Client Review Portal**: Client-facing review links allowing external stakeholders to test and pin feedback without account creation.

---

## 3. Feature Breakdown & User Flows

### Feature 1: Interactive Pin & Comment Placement
- **Description**: Users inspect a live proxied page, select a target DOM element, and attach structured feedback with severity, categorization, and screenshots.
- **Key User Flows**:
  - `Navigate to /project/[id]` ➔ Click target DOM element ➔ Enter title & description ➔ Select severity & issue type ➔ Submit ➔ Real-time marker appears on canvas and in feed.
  - `Navigate to /review/[token]` ➔ Client opens guest portal ➔ Inspects element ➔ Submits feedback ➔ Synchronized back to project workspace.

### Feature 2: STAGE AI Copilot Site Analysis
- **Description**: Heuristic engine extracts DOM headings, colors, and CTAs, evaluating contrast, spatial rhythm, and information architecture.
- **Key User Flows**:
  - `Navigate to /project/[id]` ➔ Open Copilot docked bar ➔ Click "Analyze Site" ➔ Review Top 3 strategic recommendations (CRO, Typography, Polish) ➔ Review visual benchmark references (e.g. *Linear Bento Showcase*) ➔ Click "Live Preview" to test CSS mutation ➔ Click **"Pin for Developer"** to save high-priority marker.

### Feature 3: Developer Directive & Cursor Prompt Export
- **Description**: Turns client observations and AI suggestions into decision-complete engineering tasks.
- **Key User Flows**:
  - `Navigate to /issues` or open Pin Drawer ➔ Review Senior Developer Directive callout ➔ Inspect Benchmark reference link ➔ Click **"Copy Prompt for Cursor"** ➔ Paste prompt directly into Cursor or AI coding agent to implement code fix.

### Feature 4: Blueprint Spatial Canvas Collaboration
- **Description**: Infinite spatial 2D/3D canvas for architectural mapping, connecting page flows, and multiplayer collaboration.
- **Key User Flows**:
  - `Navigate to /canvas/[projectId]` ➔ Create and position frames ➔ Connect frames with directed arrows ➔ Live cursor tracking of other online team members.

### Feature 5: Webhook & Developer Notification Dispatch
- **Description**: Automated delivery of new pins to Slack channels, Discord servers, and developer outbox queues.
- **Key User Flows**:
  - `Navigate to /settings/notifications` ➔ Enter Slack or Discord Webhook URL ➔ Save settings ➔ When a client pins a change, rich notification card is delivered immediately with direct links to the pin.

---

## 4. Tech Stack Specification
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, Lucide React
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0 (AsyncIO), SQLite / PostgreSQL (asyncpg), aiosqlite
- **Realtime**: WebSockets, Redis Pub/Sub, Outbox Pattern
- **Testing**: TestSprite MCP Server (`@testsprite/testsprite-mcp`), Pytest, Vitest, Playwright

---

## 5. Specification File References
- **Standard PRD (JSON)**: [testsprite_tests/standard_prd.json](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/testsprite_tests/standard_prd.json)
- **Standard PRD (Markdown)**: [testsprite_tests/standard_prd.md](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/testsprite_tests/standard_prd.md)
- **Code Summary**: [testsprite_tests/tmp/code_summary.yaml](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/testsprite_tests/tmp/code_summary.yaml)
- **System Design Spec**: [docs/system-design.md](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/system-design.md)
- **System Architecture Spec**: [docs/architecture.md](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/architecture.md)
- **API Spec**: [docs/api.md](file:///c:/Users/saumy/OneDrive/Desktop/Entrext/docs/api.md)
