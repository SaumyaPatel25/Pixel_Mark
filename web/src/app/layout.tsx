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

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  title: seoConfig.title,
  description: seoConfig.description,
};

import { Suspense } from "react";
import { CustomCursor } from "@/components/CustomCursor";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ToastContainer } from "@/components/ui/ToastContainer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

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
    "logo": `${seoConfig.siteUrl}/og-image.png`,
    "sameAs": [
      seoConfig.githubUrl,
      seoConfig.linkedinCompanyUrl,
      seoConfig.linkedinUrl
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
    "name": "PixelMark",
    "url": seoConfig.siteUrl,
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
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col selection:bg-cyan-500/20 selection:text-cyan-200">
        <GoogleAnalytics />
        <AuthInitializer />
        <CustomCursor />
        <ToastContainer />
        <Suspense fallback={null}>
          <PostHogProvider>
            <main className="relative z-10 flex-1 flex flex-col">
              {children}
            </main>
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
