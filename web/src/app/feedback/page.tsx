import { Suspense } from 'react';
import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import FeedbackClient from './FeedbackClient';
import { StageLoader } from '@/components/ui/StageLoader';

export const metadata: Metadata = {
  title: 'Product Feedback & Feature Requests',
  description: 'Share your ideas, feature requests, or report bugs directly to the creators of STAGE. Help shape the future of visual website feedback.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/feedback`,
  },
  openGraph: {
    title: `Share Feedback & Suggestions | ${seoConfig.shortTitle}`,
    description: 'Help shape the future of STAGE. Tell us what features to add, what to improve, or what to remove directly to the creators.',
    url: `${seoConfig.siteUrl}/feedback`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Feedback & Product Roadmap Suggestions',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Share Feedback & Suggestions | ${seoConfig.shortTitle}`,
    description: 'Help shape the future of STAGE. Tell us what features to add, what to improve, or what to remove directly to the creators.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

export default function FeedbackPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: seoConfig.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Feedback',
        item: `${seoConfig.siteUrl}/feedback`,
      },
    ],
  };

  const contactPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'STAGE Feedback & Feature Suggestions',
    description: 'Direct feedback and feature request channel for STAGE website feedback platform.',
    url: `${seoConfig.siteUrl}/feedback`,
    mainEntity: {
      '@type': 'Organization',
      name: 'STAGE by Entrext Labs',
      email: 'saumya@entrext.com',
      url: seoConfig.siteUrl,
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'saumya@entrext.com',
        contactType: 'Founder & Engineering',
        availableLanguage: ['English']
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />
      <Suspense fallback={
        <div className="min-h-screen bg-pm-bg text-pm-text flex flex-col items-center justify-center">
          <StageLoader size="md" text="Loading feedback portal..." />
        </div>
      }>
        <FeedbackClient />
      </Suspense>
    </>
  );
}
