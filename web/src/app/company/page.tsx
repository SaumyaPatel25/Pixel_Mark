import type { Metadata } from 'next';
import CompanyClient from './CompanyClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: 'Company Hub & Opportunity Center',
  description: 'Learn about the story, future vision, and careers at PixelMark. Built for designers, developers, QA teams, and investors alike.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/company`,
  },
  openGraph: {
    title: 'Company Hub & Opportunity Center | PixelMark',
    description: 'Learn about the story, future vision, and careers at PixelMark. Built for designers, developers, QA teams, and investors alike.',
    url: `${seoConfig.siteUrl}/company`,
    siteName: 'PixelMark',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PixelMark - Company Story & Opportunities',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Company Hub & Opportunity Center | PixelMark',
    description: 'Learn about the story, future vision, and careers at PixelMark. Built for designers, developers, QA teams, and investors alike.',
    images: ['/og-image.png'],
    creator: seoConfig.twitterHandle,
  },
};

export default function CompanyHubPage() {
  return <CompanyClient />;
}
