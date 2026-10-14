import type { Metadata } from 'next';
import HomeClient from '@/components/marketing/HomeClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: {
    absolute: seoConfig.title,
  },
  description: seoConfig.description,
  alternates: {
    canonical: `${seoConfig.siteUrl}`,
  },
  openGraph: {
    title: seoConfig.title,
    description: seoConfig.description,
    url: `${seoConfig.siteUrl}`,
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
  return <HomeClient />;
}
