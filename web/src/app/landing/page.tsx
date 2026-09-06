import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import ProductPageClient from '@/components/marketing/ProductPageClient';

export const metadata: Metadata = {
  title: 'Visual QA Platform for Clients & Developers',
  description: 'Zero extensions. Real-time visual QA on live websites. Save 10+ hours per week with automated DOM telemetry and instant client review links.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/landing`,
  },
  openGraph: {
    title: 'STAGE — Visual QA Platform for Clients & Developers',
    description: 'Zero extensions. Real-time visual QA on live websites. Save 10+ hours per week with automated DOM telemetry.',
    url: `${seoConfig.siteUrl}/landing`,
    siteName: 'STAGE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: 'STAGE — Visual QA Platform for Clients & Developers',
    description: 'Zero extensions. Real-time visual QA on live websites. Save 10+ hours per week with automated DOM telemetry.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function LandingPage() {
  return <ProductPageClient />;
}
