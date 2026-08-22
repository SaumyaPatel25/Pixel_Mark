import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import FeaturesClient from './FeaturesClient';

export const metadata: Metadata = {
  title: 'Features — Visual Feedback, WebGL 3D & DOM Edits',
  description: 'Pin comments on live websites, inspect WebGL/Three.js targets, stream real-time CSS/DOM edits, and capture automated XPath bug telemetry with STAGE.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/features`,
  },
  openGraph: {
    title: `Platform Features | ${seoConfig.shortTitle}`,
    description: 'Pin comments on live websites, inspect WebGL/3D canvases, stream real-time DOM edits, and capture automated XPath telemetry.',
    url: `${seoConfig.siteUrl}/features`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Platform Features',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Platform Features | ${seoConfig.shortTitle}`,
    description: 'Pin comments on live websites, inspect WebGL/3D canvases, and stream real-time DOM edits.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

export default function FeaturesPage() {
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
        name: 'Features',
        item: `${seoConfig.siteUrl}/features`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <FeaturesClient />
    </>
  );
}
