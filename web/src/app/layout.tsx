import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { seoConfig } from "@/lib/seoConfig";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: '#FAF2F2',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  title: {
    default: seoConfig.title,
    template: `%s | ${seoConfig.shortTitle}`
  },
  description: seoConfig.description,
  alternates: {
    canonical: './',
  },
  openGraph: {
    title: seoConfig.title,
    description: seoConfig.description,
    url: seoConfig.siteUrl,
    siteName: 'STAGE',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE — The Visual Website Feedback Tool Built for Product Teams',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: seoConfig.title,
    description: seoConfig.description,
    images: [`${seoConfig.siteUrl}/og-image.png`],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
};

import { Suspense } from "react";
import { CustomCursor } from "@/components/CustomCursor";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { ToastContainer } from "@/components/ui/ToastContainer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { QueueIndicator } from "@/components/ui/QueueIndicator";
import MonkfeedWidget from "@/components/MonkfeedWidget";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": seoConfig.company,
    "url": seoConfig.siteUrl,
    "logo": `${seoConfig.siteUrl}/icon-512.png`,
    "sameAs": [
      seoConfig.githubUrl,
      seoConfig.linkedinCompanyUrl,
      seoConfig.twitterUrl
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": seoConfig.email,
      "contactType": "customer support"
    }
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "STAGE",
    "url": seoConfig.siteUrl,
    "description": seoConfig.description,
    "keywords": "visual website feedback tool, bug reporting software, QA annotation tool, website review link generator",
    "publisher": {
      "@type": "Organization",
      "name": seoConfig.company
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${seoConfig.siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #FAF2F2 !important;
                color: #1D264F;
              }
              html[data-theme="dark"], html[data-theme="dark"] body {
                background-color: #0d0e12 !important;
                color: #e2e4e9;
              }
            `
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('stage_theme') || 'system';
                  var resolved = savedTheme;
                  if (savedTheme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  var doc = document.documentElement;
                  doc.setAttribute('data-theme', resolved);
                  if (resolved === 'dark') {
                    doc.classList.add('dark');
                    doc.classList.remove('light');
                  } else {
                    doc.classList.add('light');
                    doc.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--pm-bg)] text-[var(--pm-text)] selection:bg-cyan-500/20 selection:text-cyan-200">
        <GoogleAnalytics />
        <AuthInitializer />
        <ThemeInitializer />
        <CustomCursor />
        <ToastContainer />
        <QueueIndicator />
        <Suspense fallback={null}>
          <PostHogProvider>
            <main className="relative z-10 flex-1 flex flex-col">
              {children}
            </main>
            <MonkfeedWidget />
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
