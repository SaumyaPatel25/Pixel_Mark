import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import CompareClient from './CompareClient';

export const metadata: Metadata = {
  title: 'STAGE vs Marker.io vs BugHerd vs Figma -- Honest Visual Feedback Tool Comparison 2025',
  description:
    'Which visual website feedback tool is right for your workflow? Compare STAGE, Marker.io, BugHerd, and Figma across setup friction, 3D support, client access, pricing, and developer handoff. Includes where STAGE is NOT the best choice.',
  keywords: [
    'STAGE vs Marker.io',
    'STAGE vs BugHerd',
    'STAGE vs Figma',
    'visual feedback tool comparison',
    'best bug reporting tool 2025',
    'website feedback software',
    'live website QA tool',
    'Marker.io alternative',
    'BugHerd alternative',
    'zero install website feedback',
    'client website review tool',
    'staging site feedback',
  ],
  alternates: {
    canonical: `${seoConfig.siteUrl}/compare`,
  },
  openGraph: {
    title: 'STAGE vs Marker.io, BugHerd & Figma -- Which Tool Wins for Your Workflow?',
    description:
      'An honest, scenario-by-scenario comparison of the top visual website feedback tools. Find out which tool is best for client reviews, SPA QA, design sign-off, and 3D web experiences.',
    url: `${seoConfig.siteUrl}/compare`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE vs Marker.io, BugHerd and Figma -- Visual Feedback Tool Comparison 2025',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: 'STAGE vs Marker.io, BugHerd & Figma -- Which Tool Is Right for You?',
    description:
      'Honest, scenario-by-scenario breakdown. Includes where STAGE wins and where it currently does not.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function ComparePage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: seoConfig.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Compare Tools & Alternatives',
        item: `${seoConfig.siteUrl}/compare`,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the best visual website feedback tool in 2025?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The best tool depends on your workflow. STAGE is best for reviewing live staging and production websites with zero browser extensions. Marker.io is best for internal teams with deep Jira/ClickUp integrations. BugHerd is best for simple agency brochure sites with built-in kanban. Figma is best for UI design mockups before code is written.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the best Marker.io alternative?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'STAGE is the leading Marker.io alternative for teams that need zero-install client reviews. Unlike Marker.io, STAGE requires no JavaScript snippet in your codebase and no Chrome extension for reviewers -- clients just click a URL and pin feedback on the live site.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the best BugHerd alternative?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'STAGE is the top BugHerd alternative for modern React, Next.js, and SPA applications. STAGE adds zero code to your production site, supports unlimited external reviewers at no extra cost, and handles client-side routing that BugHerd script injection struggles with.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can STAGE review 3D WebGL and Three.js websites?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. STAGE is the only visual feedback tool that supports native 3D WebGL raycasting. Reviewers can pin annotations directly onto Three.js mesh geometry with spatial XYZ coordinates, not just a flat 2D screenshot overlay of the 3D scene.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does STAGE add JavaScript to my production website?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. STAGE uses a server-side reverse-proxy architecture. Nothing is added to your customer-facing JavaScript bundle, your production HTML, or your site performance budget. There is zero production footprint.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <CompareClient />
    </>
  );
}
