import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SystemCheck from '@/components/support/SystemCheck';
import { seoConfig } from '@/lib/seoConfig';
import { Activity, ShieldAlert, CheckCircle2, ArrowRight, HelpCircle, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: "Diagnostic Support & System Health",
  description:
    "Troubleshoot your STAGE setup. Check proxy connections, review session health, test agent injection, and diagnose common visual feedback issues.",
  alternates: {
    canonical: `${seoConfig.siteUrl}/support/diagnostics`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Diagnostic Support & Health | ${seoConfig.shortTitle}`,
    description:
      "Troubleshoot your STAGE setup. Check proxy connections, review session health, and diagnose common issues.",
    type: 'website',
    url: `${seoConfig.siteUrl}/support/diagnostics`,
    siteName: 'STAGE',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Diagnostic Support',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Diagnostic Support & Health | ${seoConfig.shortTitle}`,
    description: "Troubleshoot your STAGE setup and proxy connections.",
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

const issues = [
  {
    title: 'Site not loading in review frame',
    body: 'The target website may enforce strict "X-Frame-Options: DENY" or "frame-ancestors" Content-Security-Policy headers. STAGE automatically routes through an authenticated diagnostic proxy to bypass sandbox framing restrictions.',
  },
  {
    title: 'Feedback markers not saving',
    body: 'Verify your review session is still active and that the WebSocket connection is established. Network interruptions or expired share tokens can temporarily pause coordinate persistence.',
  },
  {
    title: 'Share review link expired or blocked',
    body: 'Confirm that the share token lifetime has not expired. New share links with optional password protection can be regenerated in one click from your project dashboard.',
  },
  {
    title: 'Exported file appears empty',
    body: 'Ensure the review session contains at least one saved observation pin before generating a Markdown, JSON, or CSV summary export.',
  },
  {
    title: 'Feedback overlay not appearing on client side',
    body: 'Ensure the client is opening the secure STAGE review URL directly, or toggle the STAGE Chrome Extension active for that specific local or staging domain.',
  },
  {
    title: 'OAuth login redirect issues',
    body: 'Clear cached browser cookies and session storage, then re-authenticate with GitHub. Confirm that third-party cookies are not blocked in private browsing mode.',
  },
];

export default function DiagnosticsPage() {
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
          name: 'Support & Diagnostics',
          item: `${seoConfig.siteUrl}/support/diagnostics`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Diagnostic Support & System Health — ${seoConfig.company}`,
      description:
        'Troubleshoot your STAGE setup. Check proxy connections, review session health, test agent injection, and diagnose common issues with your visual feedback workflow.',
      url: `${seoConfig.siteUrl}/support/diagnostics`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: issues.map((issue) => ({
        '@type': 'Question',
        name: issue.title,
        acceptedAnswer: { '@type': 'Answer', text: issue.body },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans selection:bg-pm-accent/20 transition-colors duration-500 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNav />

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-20 space-y-16 w-full relative z-10">

        {/* ── HERO HEADER ── */}
        <section className="space-y-4 border-b border-pm-border pb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pm-accent-subtle border border-pm-border text-pm-accent text-xs font-mono font-extrabold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Support & Diagnostics Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-pm-text leading-tight">
            Diagnose and <span className="bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">Fix Issues Fast</span>
          </h1>
          <p className="text-pm-muted text-sm md:text-base leading-relaxed max-w-2xl">
            Live infrastructure status checks, troubleshooting guides, and direct engineering escalation for your visual QA sessions.
          </p>
        </section>

        {/* ── LIVE INFRASTRUCTURE SYSTEM CHECK ── */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-pm-text">Live Infrastructure Health</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Auto-refreshes every 30 seconds across API, Auth, and DB layers
            </p>
          </div>
          <SystemCheck />
        </section>

        {/* ── COMMON ISSUES TROUBLESHOOTING GRID ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-pm-text">Troubleshooting & Resolutions</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Standard fixes for common review and proxy behaviors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-3 hover:border-pm-border-hover hover:shadow-lg transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-pm-accent">
                    <HelpCircle className="w-4 h-4 flex-shrink-0" />
                    <h3 className="text-sm font-extrabold text-pm-text leading-snug">{issue.title}</h3>
                  </div>
                  <p className="text-xs text-pm-muted leading-relaxed font-medium pl-6">{issue.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ESCALATION BANNER ── */}
        <section className="bg-pm-surface border-2 border-pm-accent/20 rounded-3xl p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden bg-gradient-to-r from-pm-accent-subtle to-transparent">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-extrabold text-pm-text">Need engineering assistance?</h3>
            <p className="text-xs text-pm-muted leading-relaxed font-medium">
              Our team is ready to debug custom CSP proxies or on-premise deployments directly.
            </p>
          </div>
          <a
            href="mailto:saumya@entrext.com?subject=STAGE%20Diagnostic%20Support%20Inquiry"
            className="flex-shrink-0 px-8 py-3.5 rounded-2xl bg-pm-accent hover:bg-pm-accent-bright text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Engineering</span>
          </a>
        </section>

      </main>

      <MarketingFooter />
    </div>
  );
}
