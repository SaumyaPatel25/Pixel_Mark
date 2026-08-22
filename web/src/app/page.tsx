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
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE — The Visual Website Feedback Tool Built for Product Teams',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: seoConfig.title,
    description: seoConfig.description,
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "STAGE",
    "operatingSystem": "Web, Windows, macOS, Linux",
    "applicationCategory": "DeveloperApplication",
    "applicationSubCategory": "Bug Tracking & Visual Feedback Software",
    "description": "Visual website feedback tool and QA bug reporting platform. Generate secure client review links to pin visual feedback directly on live web pages across DOM, WebGL 3D, and SPAs.",
    "url": seoConfig.siteUrl,
    "author": {
      "@type": "Organization",
      "name": seoConfig.company,
      "url": seoConfig.siteUrl
    },
    "featureList": [
      "Visual Website Feedback Pinning",
      "Interactive DOM, WebGL 3D & Canvas Bug Reporting",
      "Real-Time WebSocket Synchronization",
      "Automated Technical Diagnostics & XPath Telemetry",
      "No-Code Client Review Link Generation",
      "Live CSS & DOM Edit Streaming"
    ],
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "0",
      "highPrice": "29",
      "offerCount": "3"
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
