# Action Plan

- URL: `https://stage.entrext.com`
- Overall score: `70/100`

## Priority Fixes

1. **Missing H1 on page**
   - Priority: `Critical`
   - Area: `environment`
   - Evidence: No primary content heading was detected, which weakens topical clarity.
   - Fix: Set a single semantic H1 in each route component.
2. **5 security headers missing**
   - Priority: `Critical`
   - Area: `environment`
   - Evidence: Missing headers reduce trust and can expose the site to browser/security risks.
   - Fix: Set security headers in `next.config.js` `headers()` or at your edge/CDN.
3. **4 orphan page(s) with zero inbound internal links.**
   - Priority: `Critical`
   - Area: `link_profile`
   - Evidence: See audit output.
   - Fix: Add internal links from relevant content pages to these orphan pages.
4. **Average internal links per page is only 0.0 (target: 5-10).**
   - Priority: `Critical`
   - Area: `link_profile`
   - Evidence: See audit output.
   - Fix: Increase internal linking by adding contextual links within content.
5. **sameAs URL returns HTTP 405: https://www.linkedin.com/in/saumya-rajeshbhai-patel-857290372**
   - Priority: `Warning`
   - Area: `entity`
   - Evidence: See audit output.
   - Fix: Update sameAs URL for LinkedIn to a valid, non-redirecting destination.
6. **Meta description is missing or out of range**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: This can reduce SERP CTR and snippet quality.
   - Fix: Use the Next.js Metadata API (`app/`) or `next/head` (`pages/`) for title/meta/OG/Twitter tags.
7. **No llms.txt found**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: AI crawlers and assistants have no curated machine-readable guidance for key pages.
   - Fix: Serve `/llms.txt` from `/public/llms.txt`.
8. **5 page(s) with no outbound internal links (dead ends).**
   - Priority: `Warning`
   - Area: `link_profile`
   - Evidence: See audit output.
   - Fix: Add contextual internal links to related content from these pages.
9. **No Wikidata entry found for 'Entrext Labs'.**
   - Priority: `Info`
   - Area: `Wikidata`
   - Evidence: See audit output.
   - Fix: If the entity meets Wikidata notability guidelines, create or improve an item with accurate third-party references. Do not create one solely for SEO.
10. **No Wikipedia article found for 'Entrext Labs'.**
   - Priority: `Info`
   - Area: `Wikipedia`
   - Evidence: See audit output.
   - Fix: Only pursue Wikipedia if the entity meets independent notability standards. Otherwise, strengthen official schema, sameAs profiles, citations, and About/Contact signals.
11. **No phone number detected on page for LocalBusiness entity.**
   - Priority: `Info`
   - Area: `entity`
   - Evidence: See audit output.
   - Fix: Display phone number visibly and include 'telephone' in LocalBusiness schema.
12. **Performance measurement incomplete**
   - Priority: `Info`
   - Area: `environment`
   - Evidence: PageSpeed API returned an error, so CWV recommendations are less reliable.
   - Fix: Set `PAGESPEED_API_KEY` in your environment or `.env` file (see `.env.example`), then rerun. The CLI also accepts `--api-key`. Prioritize LCP/INP/CLS fixes from that output.
13. **Missing sameAs link to Wikipedia (Primary KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add the existing official 'wikipedia.org' URL to sameAs; do not create this profile solely for SEO.
14. **Missing sameAs link to Wikidata (Primary KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add the existing official 'wikidata.org' URL to sameAs; do not create this profile solely for SEO.
15. **Missing sameAs link to Twitter/X (Strong KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add 'x.com' profile URL to sameAs array in your entity schema.
