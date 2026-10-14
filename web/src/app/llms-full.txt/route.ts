import { NextResponse } from 'next/server';
import { seoConfig } from '@/lib/seoConfig';

export const dynamic = 'force-static';
export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  const content = `# STAGE by Entrext Labs — Complete Reference & AI Documentation (llms-full.txt)
> Comprehensive platform documentation, feature specifications, API reference, and technical guide for STAGE.

## 1. Executive Summary
STAGE (${seoConfig.siteUrl}) is a visual website feedback, design review, and QA bug reporting platform developed by Entrext Labs. It empowers high-velocity engineering and product teams to share single-click review links where clients and teammates can drop contextual visual feedback pins directly on live websites, WebGL canvases, and Three.js 3D scenes without installing any browser extensions or creating accounts.

## 2. Platform Architecture & Core Technologies
- **Client Proxy & Sandbox Engine**: Renders live client targets in an isolated, secure browsing environment while intercepting clicks to attach spatial coordinate pins.
- **Deep DOM & CSS Inspector**: Automatically captures XPath, computed typography, box models, devicePixelRatio, viewport resolution, and console error logs alongside every annotation pin.
- **3D WebGL & Mesh Raycasting**: Raycasts against Three.js mesh coordinates and snapshots WebGL drawing buffers so reviewers can pin feedback on 3D models and interactive shaders.
- **Real-Time WebSocket Presence**: Multi-user collaboration with live comment threads, status resolution tags, and team notifications.
- **Developer Issue Handoff**: Exports cleanly formatted Markdown bug checklists for GitHub Issues, Linear, or CSV spreadsheets.

## 3. Public Endpoints & Page Directory
- Homepage: ${seoConfig.siteUrl}/
- Product Overview: ${seoConfig.siteUrl}/product
- Features & Capabilities: ${seoConfig.siteUrl}/features
- Transparent Pricing & Plans: ${seoConfig.siteUrl}/pricing
- Developer REST API & Webhooks: ${seoConfig.siteUrl}/docs/api
- Chrome Browser Extension: ${seoConfig.siteUrl}/chrome-extension
- Diagnostic System Health: ${seoConfig.siteUrl}/support/diagnostics
- Frequently Asked Questions: ${seoConfig.siteUrl}/faq
- Company & Mission: ${seoConfig.siteUrl}/company
- Developer Getting Started Guide: ${seoConfig.siteUrl}/getting-started
- Product Feedback & Roadmap: ${seoConfig.siteUrl}/feedback

## 4. Developer REST API Reference
- GET /projects: Retrieve developer workspaces and projects.
- POST /projects: Create a new project sandbox for a target website.
- GET /sessions/{id}: Inspect live review session status and metrics.
- POST /markers: Programmatically insert pins and automated test assertions.
- GET /markers/{id}: Fetch telemetry, computed styles, and screenshots for a specific marker.
- PATCH /markers/{id}: Resolve, reassign, or update marker priorities.
- GET /export/{id}/markdown: Download all feedback markers formatted as a GitHub/Linear Markdown checklist.
- GET /export/{id}/csv: Download structured CSV issue logs.

## 5. Security, Permissions & Compliance
- Tokenized Review Links: Stakeholders access review environments via cryptographic tokens with configurable expiration.
- Zero Chrome Extension Requirement: Eliminates third-party software risks and corporate IT security barriers.
- Data Privacy: STAGE strips sensitive authentication headers and respects sandbox isolation policies.

## 6. Organization & Founder
- Organization: Entrext Labs
- Founder & Principal Systems Architect: Saumya Patel
- Contact: saumya@entrext.com
- Twitter/X: https://x.com/Stage0fficial
- GitHub: https://github.com/sp25126
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
