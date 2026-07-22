import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/marketing/PublicHeader'
import { seoConfig } from '@/lib/seoConfig'

export const metadata: Metadata = {
  title: "Developer API Documentation — STAGE",
  description: "Integrate STAGE's visual feedback API into your workflow. REST endpoints for projects, sessions, markers, exports, and webhooks. Built for developers.",
  alternates: {
    canonical: `${seoConfig.siteUrl}/docs/api`
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Developer API Documentation — STAGE",
    description: "REST endpoints for projects, sessions, markers, exports, and webhooks. Built for developers.",
    type: 'website',
    url: `${seoConfig.siteUrl}/docs/api`,
  }
}

const endpoints = [
  { method: 'GET',   path: '/projects',             desc: 'List all projects' },
  { method: 'POST',  path: '/projects',             desc: 'Create a project' },
  { method: 'GET',   path: '/sessions/{id}',        desc: 'Get session details' },
  { method: 'POST',  path: '/markers',              desc: 'Create a feedback marker' },
  { method: 'GET',   path: '/markers/{id}',         desc: 'Get marker by ID' },
  { method: 'PATCH', path: '/markers/{id}',         desc: 'Update status/priority' },
  { method: 'GET',   path: '/export/{id}/markdown', desc: 'Export session as markdown' },
  { method: 'GET',   path: '/export/{id}/csv',      desc: 'Export session as CSV' },
  { method: 'POST',  path: '/share',                desc: 'Generate a share link' },
]

const methodColors: Record<string, string> = {
  GET:   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  POST:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  PATCH: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
}

const faqs = [
  {
    q: 'Is the API free to use?',
    a: 'Yes during beta. Rate limits apply on free plans.',
  },
  {
    q: 'Can I use webhooks?',
    a: 'Webhook support is coming in Q3 2026.',
  },
  {
    q: 'What formats can I export to?',
    a: 'Markdown, CSV, and JSON.',
  },
]

export default function ApiDocsPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Developer API Documentation — STAGE',
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
  ]

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans selection:bg-purple-500/30 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Dot-grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(circle, #4338ca 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <PublicHeader />

      <main className="max-w-5xl mx-auto px-5 md:px-8 py-14 space-y-20 relative z-10">

        {/* ── HERO ── */}
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-b border-pm-border pb-14">
          <div className="space-y-5 max-w-2xl">
            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1">
              REST API · v2
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
              Build with{' '}
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                STAGE API
              </span>
            </h1>
            <p className="text-pm-muted text-sm md:text-base leading-relaxed">
              Everything you need to integrate visual feedback into your dev workflow.
              REST API, webhooks, and export formats.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#endpoints"
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs text-center transition-all shadow-lg shadow-purple-950/40"
            >
              View Full Docs
            </a>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border text-pm-text font-black text-xs text-center transition-all"
            >
              Get API Key
            </Link>
          </div>
        </section>

        {/* ── BASE URL + AUTH ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Base URL · Production
            </h2>
            <p className="text-xs text-pm-muted leading-relaxed">
              All API requests must be made over HTTPS. HTTP requests will be rejected.
            </p>
            <div className="bg-pm-bg border border-pm-border rounded-xl px-4 py-3 font-mono text-xs text-pm-text break-all">
              https://api.stage.io
            </div>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Authentication · Bearer Token
            </h2>
            <p className="text-xs text-pm-muted leading-relaxed">
              Obtain your API key from the{' '}
              <Link href="/dashboard" className="text-purple-400 underline underline-offset-2">
                dashboard
              </Link>
              . Pass it as a Bearer token in every request.
            </p>
            <div className="bg-pm-bg border border-pm-border rounded-xl px-4 py-3 font-mono text-xs text-pm-text">
              Authorization: Bearer YOUR_TOKEN
            </div>
          </div>
        </section>

        {/* ── ENDPOINT TABLE ── */}
        <section id="endpoints" className="space-y-6 scroll-mt-20">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">Quick Reference</h2>
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              All available REST endpoints
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-pm-border bg-pm-surface-2 text-[10px] uppercase tracking-widest text-pm-muted/60 font-black">
                    <th className="px-5 py-3.5 w-24">Method</th>
                    <th className="px-5 py-3.5">Endpoint</th>
                    <th className="px-5 py-3.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border/50">
                  {endpoints.map((ep, i) => (
                    <tr key={i} className="hover:bg-pm-surface-2 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${methodColors[ep.method] ?? ''}`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-purple-600 dark:text-purple-300 whitespace-nowrap">
                        {ep.path}
                      </td>
                      <td className="px-5 py-3.5 text-pm-muted">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── CODE EXAMPLE ── */}
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">Example Request</h2>
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              Fetch your projects via curl
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 space-y-4 shadow-xl">
            {/* tab-like label */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-pm-surface-2 border border-pm-border rounded px-2 py-0.5 text-pm-muted">
                bash
              </span>
            </div>
            <pre className="bg-pm-bg border border-pm-border rounded-xl p-5 font-mono text-xs text-purple-600 dark:text-purple-300 overflow-x-auto leading-relaxed whitespace-pre">
{`curl \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  https://api.stage.io/projects`}
            </pre>
            <p className="text-[10px] text-pm-muted/50 font-bold uppercase tracking-wider">
              Replace <span className="text-purple-400 font-mono">YOUR_TOKEN</span> with the key from your dashboard settings.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">API FAQ</h2>
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              Common questions from developers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-pm-surface border border-pm-border rounded-2xl p-6 space-y-3 hover:border-purple-500/20 hover:shadow-md transition-all"
              >
                <h3 className="text-sm font-black text-pm-text leading-snug">{faq.q}</h3>
                <p className="text-xs text-pm-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/20 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg font-black text-pm-text">Ready to integrate?</h3>
            <p className="text-xs text-pm-muted leading-relaxed">
              Generate your API key from the dashboard and start building in minutes.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex-shrink-0 px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-950/40"
          >
            Go to Dashboard →
          </Link>
        </section>

      </main>

      <footer className="border-t border-pm-border py-8 text-center text-[10px] text-pm-muted/40 uppercase tracking-widest font-black">
        &copy; {new Date().getFullYear()} {seoConfig.company}. All rights reserved.
      </footer>
    </div>
  )
}
