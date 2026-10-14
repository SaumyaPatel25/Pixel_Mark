import React from 'react';
import { seoConfig } from '@/lib/seoConfig';

interface JsonLdProps {
  type?: 'all' | 'organization' | 'software' | 'website';
}

export const CANONICAL_PRODUCTION_URL = "https://stage.entrext.com";

export function JsonLd({ type = 'all' }: JsonLdProps) {
  // 1. Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${CANONICAL_PRODUCTION_URL}/#organization`,
    "name": "Entrext Labs",
    "alternateName": ["Entrext", "STAGE by Entrext Labs"],
    "url": CANONICAL_PRODUCTION_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${CANONICAL_PRODUCTION_URL}/logo.png`,
      "width": "480",
      "height": "320"
    },
    "founder": {
      "@type": "Person",
      "name": "Saumya Patel",
      "jobTitle": "Founder & Principal Systems Architect",
      "url": "https://github.com/sp25126"
    },
    "sameAs": [
      "https://github.com/sp25126",
      "https://www.linkedin.com/company/entrext",
      "https://x.com/Stage0fficial"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "saumya@entrext.com",
      "contactType": "customer support",
      "availableLanguage": ["English"]
    }
  };

  // 2. SoftwareApplication Schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${CANONICAL_PRODUCTION_URL}/#software`,
    "name": "STAGE",
    "applicationCategory": "DeveloperApplication",
    "applicationSubCategory": "Visual Website Feedback & QA Platform",
    "operatingSystem": "Web, Windows, macOS, Linux, iOS, Android",
    "description": "Visual website feedback and QA bug reporting software. Clients and engineering teams pin comments directly onto live DOM, WebGL, and Three.js elements without browser extensions.",
    "url": CANONICAL_PRODUCTION_URL,
    "image": `${CANONICAL_PRODUCTION_URL}/og-image.png`,
    "author": {
      "@type": "Organization",
      "@id": `${CANONICAL_PRODUCTION_URL}/#organization`
    },
    "publisher": {
      "@type": "Organization",
      "@id": `${CANONICAL_PRODUCTION_URL}/#organization`
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": `${CANONICAL_PRODUCTION_URL}/pricing`
    },
    "featureList": [
      "Zero-extension live website visual feedback",
      "DOM element selector inspection and computed style capture",
      "Three.js 3D mesh raycasting and spatial coordinate pinning",
      "WebGL shader and drawing buffer snapshot reviews",
      "Real-time multi-reviewer collaborative session sync",
      "One-click developer bug checklist and CSV export"
    ]
  };

  // 3. WebSite Schema
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${CANONICAL_PRODUCTION_URL}/#website`,
    "name": "STAGE",
    "alternateName": "STAGE Visual Feedback",
    "url": CANONICAL_PRODUCTION_URL,
    "description": seoConfig.description,
    "publisher": {
      "@type": "Organization",
      "@id": `${CANONICAL_PRODUCTION_URL}/#organization`
    }
  };

  return (
    <>
      {(type === 'all' || type === 'organization') && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      )}
      {(type === 'all' || type === 'software') && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      )}
      {(type === 'all' || type === 'website') && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      )}
    </>
  );
}

