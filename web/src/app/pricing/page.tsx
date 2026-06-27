import type { Metadata } from 'next';
import PricingClient from './PricingClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: `Pricing Subscriptions | PixelMark`,
  description: `Find the subscription tier that fits your team's visual audit intensity. PixelMark offers flexible options for independent builders and enterprise teams.`,
  alternates: {
    canonical: `${seoConfig.siteUrl}/pricing`,
  },
  openGraph: {
    title: `Pricing Subscriptions | PixelMark`,
    description: `Find the subscription tier that fits your team's visual audit intensity. PixelMark offers flexible options for independent builders and enterprise teams.`,
    url: `${seoConfig.siteUrl}/pricing`,
    siteName: 'PixelMark',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PixelMark - Pricing Subscription Tiers',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pricing Subscriptions | PixelMark`,
    description: `Find the subscription tier that fits your team's visual audit intensity. PixelMark offers flexible options for independent builders and enterprise teams.`,
    images: ['/og-image.png'],
    creator: seoConfig.twitterHandle,
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
