import type { Metadata } from 'next';
import HomeClient from '@/components/marketing/HomeClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: seoConfig.title,
  description: seoConfig.description,
  alternates: {
    canonical: `${seoConfig.siteUrl}/`,
  },
  openGraph: {
    title: seoConfig.title,
    description: seoConfig.description,
    url: `${seoConfig.siteUrl}/`,
    siteName: 'STAGE',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'STAGE - Visual Website Feedback & Bug Reporting Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: seoConfig.title,
    description: seoConfig.description,
    images: ['/og-image.png'],
    creator: seoConfig.twitterHandle,
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "STAGE",
    "operatingSystem": "Web, Windows, macOS, Linux",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Bug Tracking Software",
    "description": "Visual website feedback tool and QA bug reporting platform. Generate secure client review links to pin visual feedback directly on live websites.",
    "url": seoConfig.siteUrl,
    "featureList": [
      "Visual Website Feedback",
      "Bug Reporting",
      "QA Annotations",
      "No-Code Integration",
      "Client Review Links"
    ],
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "0",
      "highPrice": "29",
      "offerCount": "2"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
