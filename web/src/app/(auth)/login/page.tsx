import type { Metadata } from 'next';
import LoginClient from './LoginClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: 'Sign In | STAGE Dashboard',
  description: 'Access your secure STAGE QA workspace to track website feedback, review comments, and analyze site metrics.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/login`,
  },
  openGraph: {
    title: 'Sign In | STAGE Dashboard',
    description: 'Access your secure STAGE QA workspace to track website feedback, review comments, and analyze site metrics.',
    url: `${seoConfig.siteUrl}/login`,
    siteName: 'STAGE',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'STAGE - Sign In',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | STAGE Dashboard',
    description: 'Access your secure STAGE QA workspace to track website feedback, review comments, and analyze site metrics.',
    images: ['/og-image.png'],
    creator: seoConfig.twitterHandle,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
