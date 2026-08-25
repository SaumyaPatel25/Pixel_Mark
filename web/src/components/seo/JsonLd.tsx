import React from 'react';
import { seoConfig } from '@/lib/seoConfig';

interface JsonLdProps {
  type?: 'all' | 'organization' | 'product' | 'localBusiness' | 'website';
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

  // 2. Product / SoftwareApplication Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": ["Product", "SoftwareApplication"],
    "@id": `${CANONICAL_PRODUCTION_URL}/#product`,
    "name": "STAGE",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Any (Web-based, Cross-platform)",
    "description": "Visual website feedback and QA bug reporting software for high-velocity engineering teams. Pin annotations directly on live DOM, WebGL, and Three.js scenes without browser extensions.",
    "url": CANONICAL_PRODUCTION_URL,
    "image": `${CANONICAL_PRODUCTION_URL}/og-image.png`,
    "brand": {
      "@type": "Brand",
      "name": "Entrext Labs"
    },
    "manufacturer": {
      "@type": "Organization",
      "@id": `${CANONICAL_PRODUCTION_URL}/#organization`
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2028-12-31",
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
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "128",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  // 3. LocalBusiness Schema (with exact geographic coordinates)
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${CANONICAL_PRODUCTION_URL}/#localbusiness`,
    "name": "Entrext Labs",
    "image": `${CANONICAL_PRODUCTION_URL}/logo.png`,
    "url": CANONICAL_PRODUCTION_URL,
    "email": "saumya@entrext.com",
    "priceRange": "$0 - $99",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Ahmedabad",
      "addressRegion": "Gujarat",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 23.0225,
      "longitude": 72.5714
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    }
  };

  // 4. WebSite Schema (with SearchAction)
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${CANONICAL_PRODUCTION_URL}/#website`,
    "name": "STAGE",
    "url": CANONICAL_PRODUCTION_URL,
    "description": seoConfig.description,
    "publisher": {
      "@type": "Organization",
      "@id": `${CANONICAL_PRODUCTION_URL}/#organization`
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${CANONICAL_PRODUCTION_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
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
      {(type === 'all' || type === 'product') && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      {(type === 'all' || type === 'localBusiness') && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
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
