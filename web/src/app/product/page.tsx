import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import ProductPageClient from '@/components/marketing/ProductPageClient';

export const metadata: Metadata = {
  title: 'Product Overview — STAGE',
  description: 'STAGE lets clients and teammates pin comments and bug reports directly on a live website from one review link, with nothing to install.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/product`,
  },
  openGraph: {
    title: 'Product Overview — STAGE',
    description: 'Share a review link, pin comments on any live web page, and pass fixes to your developer with screenshots and element details.',
    url: `${seoConfig.siteUrl}/product`,
    siteName: 'STAGE',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE — Visual QA Platform Overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: 'STAGE Product Overview — Client & Developer Visual QA Engine',
    description: 'Cut QA turnaround by 80%. Zero browser extensions. Interactive proxy, 3D WebGL pinning, and automated telemetry.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function ProductPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${seoConfig.siteUrl}/product#breadcrumb`,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': seoConfig.siteUrl,
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Product Overview',
            'item': `${seoConfig.siteUrl}/product`,
          },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${seoConfig.siteUrl}/product#software`,
        'name': 'STAGE Visual QA Engine',
        'applicationCategory': 'DeveloperApplication',
        'operatingSystem': 'Web, Windows, macOS, Linux, iOS, Android',
        'description': 'Zero-extension visual QA and website bug reporting platform. Cut review turnaround by 80% with real-time DOM pinning, 3D WebGL raycasting, and automated technical telemetry.',
        'url': `${seoConfig.siteUrl}/product`,
        'image': `${seoConfig.siteUrl}/og-image.png`,
        'author': {
          '@type': 'Organization',
          'name': seoConfig.company,
          'url': seoConfig.siteUrl,
        },
        'featureList': [
          'Zero-Extension Live Proxy Review Links',
          'Exact Sub-Pixel XPath & DOM Telemetry',
          '3D WebGL & Canvas Coordinate Raycasting',
          'Multi-Reviewer Real-Time Presence',
          'Smart Outbox Notification Digests',
          'SLA Escalation Reminders Before Launch',
        ],
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock',
          'url': `${seoConfig.siteUrl}/pricing`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageClient />
    </>
  );
}
