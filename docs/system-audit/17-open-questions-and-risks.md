# 17 Open Questions and Risks

This document highlights critical unknowns that cannot be proven definitively from the current codebase state, representing strategic risks to the PixelMark platform.

## 1. Proxy Viability Limit
- **The Unknown:** Can a pure backend-proxy approach (intercepting external HTML/JS and injecting a review script) actually scale to complex modern web apps (React/Angular SPAs) with aggressive CSPs and service workers?
- **The Risk:** High. The app routinely breaks when trying to proxy sites like Google. If proxying fails fundamentally against major corporate targets, the entire "No Extension Required" value proposition collapses.
- **Alternative:** Forcing users to download a Chrome Extension (like the abandoned `pixelmark-lens`) might be structurally necessary for enterprise UAT.

## 2. Authentication Strategy Permanence
- **The Unknown:** Is the product committed to local JWT authentication, or is there an implicit mandate to migrate back to NextAuth/Supabase?
- **The Risk:** Medium. Continuing to build around local JWT means custom implementation of OAuth providers, password resets, and session management—a huge maintenance burden.

## 3. Database Migration History
- **The Unknown:** If the app is deployed to a fresh Neon database today, will the `main.py` lifespan `ALTER TABLE` commands execute cleanly, or will they crash due to race conditions against SQLAlchemy's `create_all`?
- **The Risk:** High. Without Alembic, schema state is a black box depending entirely on the order of execution.

## 4. Multi-Tenant Organization Data Leakage
- **The Unknown:** `Organization` and `OrgMember` models exist, but most API routes (like `/projects`) simply filter by `user_id`. Do enterprise users working in a team environment actually share projects correctly, or are they isolated?
- **The Risk:** Medium. If a team invites members, they might not be able to see each other's sessions because the backend routing logic assumes 1 User = 1 Project.

## 5. Security of Proxy Fallback
- **The Unknown:** Does the `proxy_fallback_middleware` inadvertently turn the PixelMark backend into an open proxy? 
- **The Risk:** High. If malicious actors realize they can append a forged `Referer` header with a fake `session_id`, they might be able to use the Railway server to proxy malicious traffic or bypass IP blocks.

---
- **Confidence Level:** High
- **Evidence Source:** Architectural analysis of the proxy middleware, auth routes, and E2E errors.
- **Next File to Read:** `README.md`
