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
        alt: 'PixelMark - Precision Visual Feedback & Website Audits',
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
  return <HomeClient />;
}
