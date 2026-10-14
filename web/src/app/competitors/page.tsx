import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seoConfig';
import CompareClient from '../compare/CompareClient';

export const metadata: Metadata = {
  title: 'STAGE vs Marker.io, BugHerd & Figma — Best Visual Website Feedback Tool',
  description: 'Compare STAGE with Marker.io, BugHerd, and Figma. Discover why developers and design agencies choose STAGE for zero-install live website feedback with 3D WebGL support.',
  alternates: {
    canonical: `${seoConfig.siteUrl}/compare`,
  },
  openGraph: {
    title: `STAGE vs Marker.io, BugHerd & Figma | ${seoConfig.shortTitle}`,
    description: 'Compare STAGE with Marker.io, BugHerd, and Figma. Zero browser extensions, zero code snippets, and native 3D WebGL feedback.',
    url: `${seoConfig.siteUrl}/compare`,
    siteName: 'STAGE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `STAGE vs Marker.io, BugHerd & Figma | ${seoConfig.shortTitle}`,
    description: 'Compare STAGE with Marker.io, BugHerd, and Figma. Zero browser extensions and native 3D WebGL reviews.',
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
};

export default function CompetitorsPage() {
  return <CompareClient />;
}
