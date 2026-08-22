import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import GettingStartedClient from './GettingStartedClient';

export const metadata: Metadata = {
  title: 'Getting Started Guide — Quickstart for Devs',
  description: 'Learn how to use STAGE in 5 minutes. Quickstart guide for developers creating projects and reviewers pinning feedback on live web pages.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/getting-started`,
  },
  openGraph: {
    title: `Getting Started Guide | ${seoConfig.shortTitle}`,
    description: 'Learn how to use STAGE in 5 minutes. Quickstart workflows for developers and reviewers.',
    url: `${seoConfig.siteUrl}/getting-started`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Getting Started Guide',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Getting Started Guide | ${seoConfig.shortTitle}`,
    description: 'Learn how to use STAGE in 5 minutes. Quickstart workflows for developers and reviewers.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

export default function GettingStartedPage() {
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
        name: 'Getting Started',
        item: `${seoConfig.siteUrl}/getting-started`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <GettingStartedClient />
    </>
  );
}
