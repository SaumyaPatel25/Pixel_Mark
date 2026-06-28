import type { Metadata } from 'next';
import PricingClient from './PricingClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: `Simple Pricing & Plans`,
  description: `Choose a plan that fits your visual review workflow. Pin comments, share client review links, and speed up website feedback with PixelMark.`,
  alternates: {
    canonical: `${seoConfig.siteUrl}/pricing`,
  },
  openGraph: {
    title: `Simple Pricing & Plans | PixelMark`,
    description: `Choose a plan that fits your visual review workflow. Pin comments, share client review links, and speed up website feedback with PixelMark.`,
    url: `${seoConfig.siteUrl}/pricing`,
    siteName: 'PixelMark',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PixelMark - Pricing & Plans',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Simple Pricing & Plans | PixelMark`,
    description: `Choose a plan that fits your visual review workflow. Pin comments, share client review links, and speed up website feedback with PixelMark.`,
    images: ['/og-image.png'],
    creator: seoConfig.twitterHandle,
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
