# STAGE SEO & UX Remediation Action Plan
> Prioritized implementation roadmap and verification log for STAGE (Entrext Labs).

---

## Priority 1: Immediate Blocker Fixes (Completed ✅)

| Task | File(s) | Impact | Status |
|---|---|---|---|
| **Remove Global Cursor Hijack** | `web/src/app/globals.css`<br>`web/src/app/layout.tsx`<br>`web/src/components/CustomCursor.tsx` | Eliminates `cursor: none !important;` and custom dot element. Restores standard OS mouse cursor everywhere. | **Completed** |
| **Purge Deprecated `HowTo` Schema** | `web/src/app/product/page.tsx` | Prevents Google Search Console rich-result schema deprecation errors. | **Completed** |
| **Remove Unverified `AggregateRating`** | `web/src/components/seo/JsonLd.tsx`<br>`web/src/app/product/page.tsx` | Eliminates risk of Google Search Central "Spammy Structured Markup" manual actions. | **Completed** |
| **Consolidate Duplicate Schemas** | `web/src/app/page.tsx`<br>`web/src/components/seo/JsonLd.tsx` | Removes conflicting inline `SoftwareApplication` on root page. Single source of truth in `JsonLd.tsx`. | **Completed** |

---

## Priority 2: Technical Crawlability & Canonical Tuning (Completed ✅)

| Task | File(s) | Impact | Status |
|---|---|---|---|
| **Fix Duplicate Content Canonicals** | `web/src/app/landing/page.tsx`<br>`web/src/app/overview/page.tsx` | Explicitly canonicalizes duplicate marketing views to `/product`. | **Completed** |
| **Sitemap De-duplication & Enhancement** | `web/src/app/sitemap.ts` | Pruned duplicate paths (`/landing`, `/overview`); added missing `/feedback` route. | **Completed** |
| **Robots.ts Allow-List Expansion** | `web/src/app/robots.ts` | Added `/feedback` and `/llms-full.txt` to Googlebot and AI crawlers. | **Completed** |
| **Auth Privacy & Noindex Enforcement** | `web/src/app/(auth)/login/page.tsx`<br>`web/src/app/(auth)/register/page.tsx`<br>`web/src/app/(auth)/layout.tsx` | Enforces `robots: { index: false, follow: false }` across login and registration flows. | **Completed** |

---

## Priority 3: GEO & AI Search Readiness (Completed ✅)

| Task | File(s) | Impact | Status |
|---|---|---|---|
| **Implement `/llms-full.txt`** | `web/src/app/llms-full.txt/route.ts` | Provides full contextual documentation for Perplexity, ChatGPT Search, Claude, and Gemini. | **Completed** |
| **Link Extended Docs in `llms.txt`** | `web/src/app/llms.txt/route.ts` | Connects core discovery manifest to full platform specification. | **Completed** |

---

## Verification Checklist

- [x] Run Next.js production build (`npm --prefix web run build`) &rarr; 45 static/dynamic pages compiled, 0 errors.
- [x] Run Vitest unit test suite (`npx vitest run`) &rarr; 99/99 passing tests across 10 test suites.
- [x] Verify cursor behavior in CSS & JSX &rarr; `cursor: none` removed; standard OS cursor active.
- [x] Structured data verification &rarr; Clean `Organization`, `WebSite`, `SoftwareApplication`, `BreadcrumbList`.
