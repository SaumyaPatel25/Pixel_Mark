import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import ProductPageClient from '@/components/marketing/ProductPageClient';

export const metadata: Metadata = {
  title: 'Product Overview — Client & Developer Visual QA Engine',
  description: 'The real-time visual collaboration layer for clients and developers. Cut QA turnaround by 80% with zero-install live proxies, 3D WebGL raycasting, Outbox digests, and SLA escalations.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/product`,
  },
  openGraph: {
    title: 'STAGE Product Overview — Client & Developer Visual QA Engine',
    description: 'Cut QA turnaround by 80%. Zero browser extensions. Interactive proxy, 3D WebGL pinning, and automated telemetry.',
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
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.9',
          'reviewCount': '128',
          'bestRating': '5',
          'worstRating': '1',
        },
      },
      {
        '@type': 'HowTo',
        '@id': `${seoConfig.siteUrl}/product#howto`,
        'name': 'How to Collect Live Website Visual Feedback in 5 Steps',
        'description': 'Learn how STAGE collects pixel-perfect visual annotations and developer bug telemetry directly on live web applications without extensions.',
        'step': [
          {
            '@type': 'HowToStep',
            'position': 1,
            'name': 'Paste Any Link & Initialize Session',
            'text': 'Enter your staging or production URL to generate a live, interactive review sandbox in 0.3 seconds.',
            'url': `${seoConfig.siteUrl}/product#demo-walkthrough`,
          },
          {
            '@type': 'HowToStep',
            'position': 2,
            'name': 'Point & Click Directly on Live Canvas Elements',
            'text': 'Click buttons, text, forms, or 3D WebGL meshes to drop precision visual pins.',
            'url': `${seoConfig.siteUrl}/product#demo-walkthrough`,
          },
          {
            '@type': 'HowToStep',
            'position': 3,
            'name': 'Auto-Capture Code & Telemetry Details',
            'text': 'STAGE automatically extracts computed CSS styles, XPath, device viewport dimensions, and browser specifications.',
            'url': `${seoConfig.siteUrl}/product#demo-walkthrough`,
          },
          {
            '@type': 'HowToStep',
            'position': 4,
            'name': 'Collaborate with Real-Time Presence & Smart Outbox',
            'text': 'See teammate cursors live and receive batched summary digests instead of notification spam.',
            'url': `${seoConfig.siteUrl}/product#demo-walkthrough`,
          },
          {
            '@type': 'HowToStep',
            'position': 5,
            'name': 'Resolve Issues & Sync Fixed Code',
            'text': 'Developers verify fixes against captured telemetry and resolve pins with one-click status synchronization.',
            'url': `${seoConfig.siteUrl}/product#demo-walkthrough`,
          },
        ],
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
