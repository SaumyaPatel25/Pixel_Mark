import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { seoConfig } from "@/lib/seoConfig";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
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
import { JsonLd } from "@/components/seo/JsonLd";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <JsonLd type="all" />
        <link rel="dns-prefetch" href="https://pixel-mark.onrender.com" />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  where: {
                    and: [
                      { href_matches: "/*" },
                      { not: { href_matches: "/auth/*" } },
                      { not: { href_matches: "/logout" } },
                      { not: { href_matches: "/api/*" } },
                      { not: { href_matches: "/dashboard*" } },
                      { not: { href_matches: "/project*" } },
                      { not: { href_matches: "/review*" } },
                      { not: { href_matches: "/blueprint*" } },
                      { not: { href_matches: "/settings*" } },
                      { not: { selector_matches: ".no-prerender" } }
                    ]
                  },
                  eagerness: "moderate"
                }
              ],
              prefetch: [
                {
                  urls: [
                    "/pricing",
                    "/features",
                    "/faq",
                    "/company",
                    "/docs/api",
                    "/chrome-extension",
                    "/getting-started",
                    "/support/diagnostics"
                  ],
                  eagerness: "conservative"
                }
              ]
            })
          }}
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
