import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing & Plans — Free, Dev & Enterprise',
  description: 'Transparent pricing for STAGE visual feedback tool. Start free with unlimited markers, or upgrade to Dev Team for real-time WebSocket sync and DOM edits.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/pricing`,
  },
  openGraph: {
    title: `Pricing & Plans | ${seoConfig.shortTitle}`,
    description: 'Transparent pricing for STAGE visual feedback tool. Start free or upgrade for real-time WebSocket sync and live DOM edit streaming.',
    url: `${seoConfig.siteUrl}/pricing`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Pricing & Plans',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Pricing & Plans | ${seoConfig.shortTitle}`,
    description: 'Transparent pricing for STAGE visual feedback tool. Start free or upgrade to Dev Team.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

export default function PricingPage() {
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
        name: 'Pricing',
        item: `${seoConfig.siteUrl}/pricing`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PricingClient />
    </>
  );
}
