import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { seoConfig } from '@/lib/seoConfig';
import { Terminal, Shield, Sparkles, ArrowRight, Copy, Code2, Database, Key, Layers, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: "Developer REST API Docs & Webhooks",
  description: "Integrate STAGE's visual feedback API into your workflow. REST endpoints for projects, sessions, markers, exports, and webhooks. Built for developers.",
  alternates: {
    canonical: `${seoConfig.siteUrl}/docs/api`
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Developer REST API & Webhooks | ${seoConfig.shortTitle}`,
    description: "REST endpoints for projects, sessions, markers, exports, and webhooks. Built for developers.",
    type: 'website',
    url: `${seoConfig.siteUrl}/docs/api`,
    siteName: 'STAGE',
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'STAGE Developer API Documentation',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    title: `Developer REST API & Webhooks | ${seoConfig.shortTitle}`,
    description: "REST endpoints for projects, sessions, markers, exports, and webhooks.",
    images: [`${seoConfig.siteUrl}/og-image.png`],
  }
};

const endpoints = [
  { method: 'GET',   path: '/projects',             desc: 'List all projects within your developer workspace' },
  { method: 'POST',  path: '/projects',             desc: 'Create and configure a new audit project' },
  { method: 'GET',   path: '/sessions/{id}',        desc: 'Retrieve review session details and live status' },
  { method: 'POST',  path: '/markers',              desc: 'Create an automated or programmatic feedback marker' },
  { method: 'GET',   path: '/markers/{id}',         desc: 'Fetch full metadata and telemetry for a specific marker' },
  { method: 'PATCH', path: '/markers/{id}',         desc: 'Update marker status, priority, or resolution tag' },
  { method: 'GET',   path: '/export/{id}/markdown', desc: 'Export all session markers formatted as Markdown checklist' },
  { method: 'GET',   path: '/export/{id}/csv',      desc: 'Export structured issue telemetry to spreadsheet CSV' },
  { method: 'POST',  path: '/share',                desc: 'Generate secure client review token link' },
];

const methodColors: Record<string, string> = {
  GET:   'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  POST:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  PATCH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
};

const faqs = [
  {
    q: 'Is the API free to use?',
    a: 'Yes, the REST API is included on all plans during open release. Rate limits scale with your organization tier.',
  },
  {
    q: 'Can I connect automated CI/CD pipelines?',
    a: 'Yes. You can programmatically generate session links and ingest marker summaries after automated deployment previews.',
  },
  {
    q: 'What export formats are supported?',
    a: 'We support instant exports in structured Markdown (ideal for GitHub/Linear issues), CSV, and raw JSON.',
  },
];

export default function ApiDocsPage() {
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
          name: 'API Documentation',
          item: `${seoConfig.siteUrl}/docs/api`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Developer REST API Documentation & Webhooks — ${seoConfig.company}`,
      description:
        "Integrate STAGE's visual feedback API into your workflow. REST endpoints for projects, sessions, markers, exports, and webhooks. Built for developers.",
      url: `${seoConfig.siteUrl}/docs/api`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'STAGE API',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      description: 'REST API for visual website feedback, markers, sessions, exports, and share links.',
      url: `${seoConfig.siteUrl}/docs/api`,
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
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
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-b border-pm-border pb-12">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pm-accent-subtle border border-pm-border text-pm-accent text-xs font-mono font-extrabold uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5" />
              <span>STAGE REST API · v2 Reference</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-pm-text leading-tight">
              Developer <span className="bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">REST API</span>
            </h1>
            <p className="text-pm-muted text-sm md:text-base leading-relaxed">
              Programmatically create review sessions, manage feedback pins, ingest automated XPath diagnostics, and export summaries into your engineering pipeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <a
              href="#endpoints"
              className="px-6 py-3 rounded-2xl bg-pm-accent hover:bg-pm-accent-bright text-white font-extrabold text-xs text-center transition-all shadow-lg shadow-purple-600/20"
            >
              Browse Endpoints
            </a>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-2xl bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border text-pm-text font-extrabold text-xs text-center transition-all"
            >
              Get API Key
            </Link>
          </div>
        </section>

        {/* ── BASE URL & AUTHENTICATION ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-4 shadow-sm hover:border-pm-border-hover transition-all">
            <div className="flex items-center gap-2 text-pm-accent">
              <Database className="w-4 h-4" />
              <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider">
                Base URL · Production
              </h2>
            </div>
            <p className="text-xs text-pm-muted leading-relaxed">
              All REST API requests must be served over secure HTTPS. Non-HTTPS requests are automatically rejected.
            </p>
            <div className="bg-pm-surface-2 border border-pm-border rounded-2xl px-4 py-3 font-mono text-xs text-pm-text break-all flex items-center justify-between">
              <span>https://stage.entrext.com/api</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-4 shadow-sm hover:border-pm-border-hover transition-all">
            <div className="flex items-center gap-2 text-pm-accent">
              <Key className="w-4 h-4" />
              <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider">
                Authentication · Bearer Token
              </h2>
            </div>
            <p className="text-xs text-pm-muted leading-relaxed">
              Generate an access token in your workspace settings. Pass it inside the standard <code className="font-mono bg-pm-surface-2 px-1.5 py-0.5 rounded border border-pm-border">Authorization</code> header.
            </p>
            <div className="bg-pm-surface-2 border border-pm-border rounded-2xl px-4 py-3 font-mono text-xs text-pm-text break-all">
              Authorization: Bearer YOUR_WORKSPACE_API_KEY
            </div>
          </div>
        </section>

        {/* ── QUICK REFERENCE ENDPOINT TABLE ── */}
        <section id="endpoints" className="space-y-6 scroll-mt-28">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-pm-text">Endpoints Overview</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Standard RESTful resources for review links and markers
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-pm-border bg-pm-surface-2 text-[10px] font-mono uppercase tracking-widest text-pm-muted font-black">
                    <th className="px-6 py-4 w-28">HTTP Method</th>
                    <th className="px-6 py-4">Resource Path</th>
                    <th className="px-6 py-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border">
                  {endpoints.map((ep, i) => (
                    <tr key={i} className="hover:bg-pm-surface-2/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black ${methodColors[ep.method] ?? ''}`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-pm-accent whitespace-nowrap">
                        {ep.path}
                      </td>
                      <td className="px-6 py-4 text-pm-muted font-medium">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── CODE SNIPPET EXAMPLE ── */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-pm-text">Sample cURL Request</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Authenticate and query project list
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-pm-muted ml-2">
                  bash · terminal
                </span>
              </div>
            </div>
            <pre className="bg-pm-surface-2 border border-pm-border rounded-2xl p-5 font-mono text-xs text-pm-text overflow-x-auto leading-relaxed whitespace-pre">
{`curl -X GET "https://stage.entrext.com/api/projects" \\
  -H "Authorization: Bearer YOUR_WORKSPACE_API_KEY" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </section>

        {/* ── API FAQ ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-pm-text">Developer FAQs</h2>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted">
              Common integration questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-3 hover:border-pm-accent/40 hover:shadow-lg transition-all"
              >
                <h3 className="text-sm font-extrabold text-pm-text leading-snug">{faq.q}</h3>
                <p className="text-xs text-pm-muted leading-relaxed font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BOTTOM BANNER ── */}
        <section className="bg-pm-surface border-2 border-pm-accent/20 rounded-3xl p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden bg-gradient-to-r from-pm-accent-subtle to-transparent">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-extrabold text-pm-text">Ready to integrate STAGE?</h3>
            <p className="text-xs text-pm-muted leading-relaxed font-medium">
              Create an API key inside your dashboard and start capturing feedback in minutes.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex-shrink-0 px-8 py-3.5 rounded-2xl bg-pm-accent hover:bg-pm-accent-bright text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

      </main>

      <MarketingFooter />
    </div>
  );
}
