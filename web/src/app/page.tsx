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
    siteName: 'PixelMark',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PixelMark - Visual Website Feedback & Bug Reporting Tool',
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
    "name": "PixelMark",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "description": "Visual website feedback tool and bug reporting platform that generates secure client review links to pin visual feedback directly on live websites.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
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
