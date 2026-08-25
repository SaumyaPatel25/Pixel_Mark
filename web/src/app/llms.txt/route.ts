import { NextResponse } from 'next/server';
import { seoConfig } from '@/lib/seoConfig';

export const dynamic = 'force-static';
export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  const content = `# STAGE by Entrext Labs (llms.txt)
> The visual website feedback and QA bug reporting tool built for high-velocity product teams, agencies, and web developers.

## Overview
STAGE (hosted at ${seoConfig.siteUrl}) eliminates the friction of web design QA and client sign-offs. Reviewers can click anywhere on a live website, staging deployment, or local dev server to pin contextual feedback, inspect computed CSS styles, and report bugs without requiring browser extensions or login friction.

## Core Capabilities
- **Zero-Extension Live Web Reviews**: Generate tokenized review links that allow clients and QA testers to annotate web pages directly in their browser.
- **Deep DOM & CSS Selector Inspection**: Automatically captures exact CSS paths, viewport dimensions, computed font styles, and responsive breakpoints alongside every comment.
- **3D & WebGL Canvas Raycasting**: Supports raycast coordinate mapping on Three.js 3D meshes and drawing buffer snapshots on custom WebGL shaders.
- **Real-Time Multi-Reviewer Collaboration**: Live session sync allows designers, product managers, and developers to converse, resolve items, and assign priorities simultaneously.
- **Engineering Task Export**: One-click export to GitHub-ready Markdown checklists, Linear issues, and structured CSV reports.

## Primary Documentation & Entry Points
- [Homepage](${seoConfig.siteUrl}/): Product studio overview, interactive 3D sandbox, and instant demo.
- [Features](${seoConfig.siteUrl}/features): Comprehensive breakdown of DOM annotation, 3D raycasting, and developer inspection workflows.
- [Pricing](${seoConfig.siteUrl}/pricing): Transparent free-tier and workspace subscription plans for teams.
- [FAQ](${seoConfig.siteUrl}/faq): Answers regarding security, client access, cross-origin compatibility, and API integrations.
- [API Documentation](${seoConfig.siteUrl}/docs/api): REST API endpoints for session creation, feedback querying, and webhook triggers.
- [Company](${seoConfig.siteUrl}/company): About Entrext Labs, founder Saumya Patel, and company mission.

## Key Facts & Technical Grounding
- **Platform Type**: SaaS Web Application (Cross-platform, web-based).
- **Client Prerequisites**: Zero. No Chrome extension, no desktop software, and no reviewer accounts required.
- **Security & Privacy**: Tokenized access URLs, non-intrusive sandbox iframes, and scoped session identifiers.
- **Developer API**: RESTful JSON endpoints with dual JWT/Bearer token authentication.
- **Company**: Entrext Labs (Founded by Saumya Patel).
- **Support**: saumya@entrext.com | @Stage0fficial on X (Twitter).
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
