import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import { faqs } from '@/lib/faqData';
import FAQClient from './FAQClient';

export const metadata: Metadata = {
  title: 'FAQ & Help Center — Visual Website Feedback',
  description: 'Find answers to common questions about STAGE: visual feedback pinning, WebGL/3D canvas support, real-time collaboration, and client review links.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/faq`,
  },
  openGraph: {
    title: `Frequently Asked Questions | ${seoConfig.shortTitle}`,
    description: 'Find answers to common questions about STAGE: visual feedback pinning, WebGL/3D canvas support, and client review links.',
    url: `${seoConfig.siteUrl}/faq`,
    siteName: 'STAGE',
    type: 'website',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Frequently Asked Questions',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Frequently Asked Questions | ${seoConfig.shortTitle}`,
    description: 'Find answers to common questions about STAGE: visual feedback pinning, WebGL 3D review, and client links.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

export default function FAQPage() {
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
        name: 'FAQ',
        item: `${seoConfig.siteUrl}/faq`,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClient />
    </>
  );
}
