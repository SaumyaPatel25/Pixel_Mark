import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import CompareClient from './CompareClient';

export const metadata: Metadata = {
  title: 'STAGE vs Marker.io, BugHerd & Figma — Best Visual Website Feedback Tool',
  description: 'Compare STAGE with Marker.io, BugHerd, and Figma. Discover why developers and design agencies choose STAGE for zero-install live website feedback with 3D WebGL support.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/compare`,
  },
  openGraph: {
    title: `STAGE vs Marker.io, BugHerd & Figma | ${seoConfig.shortTitle}`,
    description: 'Compare STAGE with Marker.io, BugHerd, and Figma. Zero browser extensions, zero code snippets, and native 3D WebGL feedback.',
    url: `${seoConfig.siteUrl}/compare`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE vs Marker.io, BugHerd and Figma Competitor Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `STAGE vs Marker.io, BugHerd & Figma | ${seoConfig.shortTitle}`,
    description: 'Compare STAGE with Marker.io, BugHerd, and Figma. Zero browser extensions and native 3D WebGL reviews.',
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
        name: 'Compare & Competitors',
        item: `${seoConfig.siteUrl}/compare`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CompareClient />
    </>
  );
}
