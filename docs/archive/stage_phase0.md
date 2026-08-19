# STAGE Phase 0 — Product Spine & Guardrails

## Purpose

Phase 0 has one job: lock down what STAGE is, who it is for, and what must never change before a single line of new code is written. Every future phase references this document as a north star. If a feature idea contradicts anything in this document, it gets challenged before it gets built.

---

## Part 1 — Core Thesis (Non-Negotiable)

### What STAGE is

STAGE is a zero-friction visual feedback platform that lets testers and clients annotate live websites by clicking directly on UI elements, instantly generating structured, developer-ready bug reports — with no extensions or accounts required for the reviewer.

### What it is NOT

- It is not a general screen-recording tool (that is Loom).
- It is not a design review tool (that is Figma).
- It is not a generic project management tool (that is Jira/Linear).
- It is not a screenshot annotator (that is CloudApp/Markup Hero).

### The one sentence that defines it

> "STAGE removes ambiguity from client feedback by turning clicks on a live site into structured, developer-ready issues — with zero friction for the reviewer."

---

## Part 2 — Positioning Spine

### Core pain

UI feedback is vague, scattered across emails, WhatsApp, and calls, and lacks vital technical context (screen size, browser, exact DOM element). Teams waste hours decoding feedback instead of fixing it.

### Core user (ICP)

| Role | Why they need it | Trigger moment |
|------|-----------------|----------------|
| Freelance web developer | Clients send screenshots on WhatsApp with zero context | Entering UAT / final approval phase |
| Frontend team lead | Review cycles break when multiple stakeholders join | Sprint QA or staging review |
| Digital agency | Juggling many clients with varying technical ability | Any client-facing review |
| QA tester | Reproducing bugs wastes more time than fixing them | Cross-browser / cross-device testing |
| Startup founder (UAT) | Doing internal dogfooding before launch | Pre-launch bug hunt |

### What must never change

1. **Zero friction for the reviewer** — a client should be able to leave feedback from a shared link with no extension install and no account creation.
2. **DOM context is always captured automatically** — XPath, CSS selector, screen size, browser. The reviewer never has to provide this manually.
3. **Developer-ready output** — every marker produces output that can go directly into a Jira ticket, GitHub issue, or Linear card.

### What is optional / nice-to-have

- AI features (useful but not core to the value proposition)
- Canvas layer (enhances experience but not a prerequisite)
- Chrome extension (power tool for devs, not required for client use)
- Integrations (Slack, Notion, Linear — all valuable but not day-one critical)

---

## Part 3 — Competitive Guardrails

### Solution gap (why existing tools fail)

| Tool | What it does | Why it fails for STAGE's ICP |
|------|-------------|----------------------------------|
| Loom | Screen recording | Needs the reviewer to narrate, no DOM context |
| Markup Hero / CloudApp | Screenshot annotation | Static screenshots lose browser/DOM/screen data |
| BugHerd | Click-to-annotate | Requires script installation on client's site |
| Usersnap | Visual feedback widget | Requires JS embed on site, heavy setup |
| Figma comments | Design file review | Works on designs, not live staged sites |
| Generic screenshot + Slack | Informal feedback | No structure, no reproducibility |

### STAGE's defensible position

- **Proxy engine** — no script embed, no extension needed for the reviewer.
- **Auto-context capture** — DOM, XPath, browser, OS, screen, scroll position captured automatically.
- **Share-link model** — one URL, no accounts, works on any device.

---

## Part 4 — Product Versions & Differentiation

### Website (Client-first review hub)

Primary audience: freelancers, agencies, PMs, and non-technical clients.

What it prioritizes:
- Zero friction for reviewers
- Canvas layer for project-level overview
- AI summaries and triage for team leads
- Integrations with Jira, Linear, Slack, Notion

### Chrome Extension (Developer power tool)

Primary audience: frontend developers, QA engineers, team leads.

What it prioritizes:
- Works on localhost, behind-auth environments
- Deep context: console errors, network failures, component info
- AI dev assistant: root cause suggestions, fix snippets
- Feeds data into the same web Command Center

### How they relate

The extension is an advanced entry point. All data from both surfaces lands in the same NeonDB backend and web Command Center. A team can use the website link to collect client feedback and the extension to collect developer/QA feedback — both visible in one place.

---

## Part 5 — Phase 0 AI Prompts

Use these verbatim. Paste each into GPT-4o or Claude Sonnet. Validate outputs before moving to Phase 1.

---

### Prompt 0.1 — Positioning validation

```
You are a senior product strategist with deep experience in developer tools and SaaS.

Here is the product spec for STAGE:

Name: STAGE
Core product: A zero-friction visual feedback platform that lets testers and clients annotate live websites by clicking directly on live UI elements. No extension or login required for the reviewer. Each click auto-captures DOM context (XPath, CSS selector, browser, screen size, scroll position) and generates a structured, developer-ready bug report.

ICP: Freelance web developers, frontend teams, QA testers, digital agencies, startup founders doing UAT.

Key differentiator: Proxy-based engine — no script embed or Chrome extension required for the reviewer. Share a link, they click, we capture everything.

Please do the following:
1. Summarise the core pain in 2 sentences (as felt by the developer, not by the client).
2. Write 3 positioning sentences that make it impossible to confuse STAGE with a screen recorder or screenshot tool.
3. Identify the top 3 objections a potential user might raise and suggest how to handle each.
4. Flag any positioning weakness that could be a problem in a competitive market.
```

**Expected output:** 2 sentences on pain, 3 positioning lines, 3 handled objections, 1–2 honest weaknesses.

**Validation test:** Read the 3 positioning sentences aloud. If they could describe Loom, BugHerd, or a screenshot tool — they are not specific enough. Iterate until they could only describe STAGE.

---

### Prompt 0.2 — ICP depth interview simulation

```
You are a senior UX researcher and product strategist.

Simulate a 10-question user discovery interview with a freelance web developer who currently handles client QA using screenshots and WhatsApp messages. 

For each question:
- Write the question
- Write a realistic answer from the developer's perspective
- Extract one "insight" from that answer that is useful for product positioning

Focus on: how they currently handle UAT, what goes wrong, what language they use to describe the problem, what they wish existed.
```

**Expected output:** 10 Q&A pairs with insight extractions. This gives you real language for future LinkedIn posts and landing page copy.

**Validation test:** Does the language used in the answers match what your real LinkedIn commenters said? If yes, your positioning is grounded.

---

### Prompt 0.3 — Feature prioritisation audit

```
You are a senior product manager who has shipped B2B SaaS tools used by developers and agencies.

Here is a full feature list for STAGE 2.0:

CORE:
- Proxy engine (no extension for reviewer)
- Ctrl+Click overlay with marker drop
- Auto-context capture (XPath, CSS, browser, screen, scroll, innerText)
- Share links (no login for reviewer)
- Real-time Command Center (WebSocket)
- One-click export (Jira/Linear/Markdown/CSV/Notion)

CANVAS:
- Frames per page/route
- Pan/zoom
- Flow mapping (user journeys)
- Marker clusters/groups
- Snapshot timeline (v1, v2, v3 comparison)
- Multi-cursor presence

CHROME EXTENSION:
- DOM-native overlay (works on localhost, behind-auth)
- Console error capture
- Network failure capture
- Component identification (React/Vue/Svelte)
- Redux/Zustand state snapshot
- Sync to web Command Center

AI LAYER:
- Priority triage (critical/high/medium/low)
- Session summary + report
- Feedback clustering (embeddings + k-means)
- Impact vs effort scoring (2x2 matrix)
- AI dev assistant (root cause, fix snippet, PM explanation)
- UX smell detector
- Session replay insights

INTEGRATIONS:
- Jira, Linear, GitHub Issues
- Slack notifications
- Notion export
- Client portal (read-only, no login)

Rate each feature across:
- Must-have (product fails without it)
- Should-have (significantly improves product)
- Nice-to-have (valuable but deferrable)
- Risky (hard to build + uncertain value)

Output as a table. Then write a recommended build sequence for the first 90 days.
```

**Expected output:** Feature priority table + 90-day build sequence.

**Validation test:** Does the 90-day sequence match your Phase 1–4 roadmap? Adjust if the AI finds a better order.

---

### Prompt 0.4 — Anti-features list

```
You are a product director who has seen SaaS products die from feature bloat.

Given STAGE's positioning (zero-friction visual feedback, developer-ready output, no extension for reviewer), identify:

1. 5 features that would actively harm the product if added too early (explain why each one damages the positioning or UX).
2. 3 features that seem valuable but are actually just copying competitors (and what to do instead).
3. The single biggest "feature trap" for this type of product — the thing everyone asks for but that would destroy the core value prop.
```

**Expected output:** A short "do not build" list. Keep this as a reference when deciding what goes into each sprint.

**Validation test:** Read this list before every feature planning session. If a new idea appears on it, require extra justification before adding it to the roadmap.

---

## Part 6 — Phase 0 Deliverables Checklist

Complete all of these before starting Phase 1.

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Core thesis written (1 sentence) | ☐ | Must pass "could this describe Loom?" test |
| ICP table confirmed with real user signals | ☐ | Validate against LinkedIn comments collected |
| 3 positioning sentences | ☐ | Must be STAGE-exclusive |
| Prompt 0.1 output reviewed | ☐ | Weaknesses acknowledged and logged |
| Prompt 0.2 output reviewed | ☐ | Language extracted for future copy |
| Prompt 0.3 feature table complete | ☐ | 90-day sequence agreed |
| Prompt 0.4 anti-features list saved | ☐ | Pinned in Notion/docs for all sprints |
| Phase 1 start conditions met | ☐ | All above complete |

---

## Part 7 — Phase 0 Exit Test

Before moving to Phase 1 (NeonDB migration), answer these 5 questions in writing. If you cannot answer all 5 confidently, repeat Phase 0.

1. In one sentence: what does STAGE do that no other tool does?
2. Who is the most important user to make happy first, and why?
3. What is the one thing that must never be compromised in the product, even under time pressure?
4. What is the biggest risk to the product's positioning in the next 6 months?
5. What does success look like at the end of Phase 4 (AI Layer v1)?

---

*Phase 0 complete → proceed to Phase 1: NeonDB Migration & Auth.*
