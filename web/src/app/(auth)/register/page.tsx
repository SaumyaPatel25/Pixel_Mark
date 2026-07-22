import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: 'Sign Up | STAGE Dashboard',
  description: 'Create your secure STAGE workspace to start visual website feedback, drop pins, and invite reviewers with zero friction.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/register`,
  },
  openGraph: {
    title: 'Sign Up | STAGE Dashboard',
    description: 'Create your secure STAGE workspace to start visual website feedback, drop pins, and invite reviewers with zero friction.',
    url: `${seoConfig.siteUrl}/register`,
    siteName: 'STAGE',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'STAGE - Sign Up',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign Up | STAGE Dashboard',
    description: 'Create your secure STAGE workspace to start visual website feedback, drop pins, and invite reviewers with zero friction.',
    images: ['/og-image.png'],
    creator: seoConfig.twitterHandle,
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
