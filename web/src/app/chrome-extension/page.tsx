import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import WaitlistForm from '@/components/chrome-extension/WaitlistForm';
import { seoConfig } from '@/lib/seoConfig';
import { Check, Clock3, Sparkles, ArrowRight, ShieldCheck, Zap, Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: "Chrome Extension — Visual Feedback on Any Page",
  description:
    "Review and annotate any website without installing code. Hover to inspect, click to mark, and export feedback in seconds with STAGE Chrome Extension.",
  alternates: {
    canonical: `${seoConfig.siteUrl}/chrome-extension`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Chrome Extension | ${seoConfig.shortTitle}`,
    description:
      "Review and annotate any website without installing code. Hover to inspect, click to mark, export feedback in seconds.",
    type: 'website',
    url: `${seoConfig.siteUrl}/chrome-extension`,
    siteName: 'STAGE',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Chrome Extension',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Chrome Extension | ${seoConfig.shortTitle}`,
    description: "Review and annotate any website without installing code.",
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

const featureList = [
  { title: 'Hover & Inspect Any Element', desc: 'Auto-highlight bounding boxes, computed styles, and element tags' },
  { title: 'Shift + Click Feedback Pinning', desc: 'Drop contextual observation pins on live production or staging environments' },
  { title: 'Automated XPath & Box Model Telemetry', desc: 'Captures full DOM hierarchy and responsive coordinates automatically' },
  { title: 'Zero Code Injection Required', desc: 'Review client websites, third-party sites, or local dev ports without SDK scripts' },
  { title: 'Live WebSocket Dashboard Sync', desc: 'Stream observations directly to your team inbox in real time' },
];

export default function ChromeExtensionPage() {
  const jsonLd = [
    {
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
          name: 'Chrome Extension',
          item: `${seoConfig.siteUrl}/chrome-extension`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'STAGE Chrome Extension',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Chrome Browser',
      description:
        'Visual website review tool that works on any page directly from your browser. No code required.',
      url: `${seoConfig.siteUrl}/chrome-extension`,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    }
  ];

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans selection:bg-pm-accent/20 transition-colors duration-500 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNav />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20 space-y-16 w-full relative z-10">

        {/* ── HERO SECTION ── */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-mono font-extrabold uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span>Developer Beta In Progress · Q3 2026</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-pm-text leading-tight">
            Visual Feedback On Any Web Page — <span className="bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">Zero Code</span>
          </h1>

          <p className="text-pm-muted text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            The upcoming STAGE Chrome Extension allows you to inspect, pin annotations, and record bug telemetry on any web page directly from your browser tab.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#notify"
              className="px-8 py-3.5 rounded-2xl bg-pm-accent hover:bg-pm-accent-bright text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/20"
            >
              Get Early Access Invite
            </a>
            <Link
              href="/dashboard"
              className="px-6 py-3.5 rounded-2xl border border-pm-border bg-pm-surface hover:bg-pm-surface-2 text-pm-text font-bold text-xs transition-all"
            >
              Open Dashboard →
            </Link>
          </div>
        </section>

        {/* ── CAPABILITIES PREVIEW ── */}
        <section className="space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-pm-text">Extension Superpowers</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Built for rapid frontend QA and client sign-offs
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 space-y-4 shadow-xl max-w-2xl mx-auto w-full">
            {featureList.map((feat, i) => (
              <div key={i} className="flex items-start gap-3.5 p-2.5 rounded-2xl hover:bg-pm-surface-2/60 transition-colors">
                <span className="flex-shrink-0 w-6 h-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mt-0.5 text-emerald-500">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold text-pm-text">{feat.title}</h3>
                  <p className="text-xs text-pm-muted leading-relaxed font-medium mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── EARLY ACCESS WAITLIST ── */}
        <section id="notify" className="max-w-2xl mx-auto w-full space-y-6 scroll-mt-28">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-pm-text">Join Early Access</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Be the first to test the extension beta
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 shadow-xl">
            <WaitlistForm />
          </div>
        </section>

        {/* ── STATUS CARD ── */}
        <section className="max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-4 bg-pm-surface-2 border border-pm-border rounded-2xl px-6 py-4">
            <Clock3 className="w-5 h-5 text-pm-accent flex-shrink-0" />
            <p className="text-xs text-pm-muted leading-relaxed font-medium">
              <strong className="text-pm-text">Release Target: Q3 2026.</strong> Real-time DOM telemetry and coordinate mapping engines are fully verified.
            </p>
          </div>
        </section>

      </main>

      <MarketingFooter />
    </div>
  );
}
