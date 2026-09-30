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
        alt: 'STAGE review of a live website with a numbered pin and the comment attached to it',
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
    "applicationSubCategory": "Visual Website Feedback Software",
    "description": "Visual website feedback with one review link. Clients and teammates pin comments and bug reports on your live site, including 3D pages. No install.",
    "url": seoConfig.siteUrl,
    "author": {
      "@type": "Organization",
      "name": seoConfig.company,
      "url": seoConfig.siteUrl
    },
    "featureList": [
      "Pin comments on live web pages",
      "Instant client review links without logins",
      "Automated screenshot and element telemetry",
      "Works on live and public staging websites",
      "Send comments directly to GitHub issues",
      "Phone and desktop viewport review modes"
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
