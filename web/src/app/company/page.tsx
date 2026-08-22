import type { Metadata } from 'next';
import CompanyClient from './CompanyClient';
import { seoConfig } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: 'Company & Mission — Building Visual QA Tools',
  description: 'Discover the story, mission, and careers at STAGE. Built by Entrext Labs for designers, developers, product teams, and QA engineers.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/company`,
  },
  openGraph: {
    title: `Company Hub & Mission | ${seoConfig.shortTitle}`,
    description: 'Learn about the story, future vision, and careers at STAGE. Built for designers, developers, QA teams, and investors alike.',
    url: `${seoConfig.siteUrl}/company`,
    siteName: 'STAGE',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Company Story & Opportunities',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Company Hub & Mission | ${seoConfig.shortTitle}`,
    description: 'Learn about the story, future vision, and careers at STAGE.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function CompanyHubPage() {
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
        name: 'Company',
        item: `${seoConfig.siteUrl}/company`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CompanyClient />
    </>
  );
}
