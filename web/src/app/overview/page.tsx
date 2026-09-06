import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import ProductPageClient from '@/components/marketing/ProductPageClient';

export const metadata: Metadata = {
  title: 'Platform Overview',
  description: 'Learn how STAGE cuts client-developer turnaround by 80% with zero-install live proxies and automated bug telemetry.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/overview`,
  },
  openGraph: {
    title: 'STAGE Platform Overview',
    description: 'Learn how STAGE cuts client-developer turnaround by 80% without browser extensions.',
    url: `${seoConfig.siteUrl}/overview`,
    siteName: 'STAGE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: 'STAGE Platform Overview',
    description: 'Learn how STAGE cuts client-developer turnaround by 80% without browser extensions.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function OverviewPage() {
  return <ProductPageClient />;
}
