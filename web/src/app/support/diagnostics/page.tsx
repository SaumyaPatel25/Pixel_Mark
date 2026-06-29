import React from 'react'
import type { Metadata } from 'next'
import PublicHeader from '@/components/marketing/PublicHeader'
import SystemCheck from '@/components/support/SystemCheck'
import { seoConfig } from '@/lib/seoConfig'

export const metadata: Metadata = {
  title: "Diagnostic Support — PixelMark",
  description:
    "Troubleshoot your PixelMark setup. Check proxy connections, review session health, test agent injection, and diagnose common issues with your visual feedback workflow.",
  alternates: {
    canonical: `${seoConfig.siteUrl}/support/diagnostics`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Diagnostic Support — PixelMark",
    description:
      "Troubleshoot your PixelMark setup. Check proxy connections, review session health, and diagnose common issues.",
    type: 'website',
    url: `${seoConfig.siteUrl}/support/diagnostics`,
  },
}

const issues = [
  {
    title: 'Site not loading in review mode',
    body: 'The target website may be blocking iframe embedding via X-Frame-Options or a strict Content-Security-Policy. Use the PixelMark Chrome Extension to annotate any website directly from your browser tab without iframe restrictions.',
  },
  {
    title: 'Markers not saving',
    body: 'Verify that your review session is still active and that your API is reachable. Transient network interruptions or session expiry can prevent comment coordinates and screenshots from being persisted.',
  },
  {
    title: 'Share link not working',
    body: 'Confirm the share token has not expired and that the correct password (if one was configured) is being used. Share tokens can be issued with strict lifetimes.',
  },
  {
    title: 'Exported file is empty',
    body: 'Ensure the review session contains at least one saved feedback marker before exporting. Sessions with no markers produce empty CSV, JSON, or Markdown outputs.',
  },
  {
    title: 'Feedback overlay not appearing',
    body: 'Ensure the PixelMark widget script tag is correctly installed on the target page, or check that the Chrome Extension is toggled on for the current domain in the extension popup.',
  },
  {
    title: 'Login not working after OAuth',
    body: 'Clear your browser cookies and local storage, then retry the GitHub OAuth flow. In development mode, confirm that callback ports and redirect URIs exactly match those configured in your GitHub OAuth app.',
  },
]

export default function DiagnosticsPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Diagnostic Support — PixelMark',
      description:
        'Troubleshoot your PixelMark setup. Check proxy connections, review session health, test agent injection, and diagnose common issues with your visual feedback workflow.',
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
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-purple-500/30 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Dot-grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #312e81 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <PublicHeader />

      <main className="max-w-5xl mx-auto px-5 md:px-8 py-14 space-y-20 relative z-10">

        {/* ── HERO ── */}
        <section className="space-y-5 border-b border-white/[0.04] pb-14">
          <span className="inline-block text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1">
            Support Center
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Diagnose and{' '}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Fix Issues Fast
            </span>
          </h1>
          <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-2xl">
            Use this guide to check your PixelMark setup, test your connections, and resolve common issues.
          </p>
        </section>

        {/* ── LIVE SYSTEM CHECK ── */}
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">System Status</h2>
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              Live health — auto-refreshes every 30 seconds
            </p>
          </div>
          <SystemCheck />
        </section>

        {/* ── COMMON ISSUES GRID ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">Common Troubleshooting Steps</h2>
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              Most issues are resolved by one of the following
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="bg-[#0d0d12] border border-white/[0.05] rounded-2xl p-6 space-y-3 hover:border-purple-500/10 hover:shadow-xl hover:shadow-purple-900/5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-[10px] font-black font-mono bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded px-2 py-0.5 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-black text-white leading-snug">{issue.title}</h3>
                </div>
                <p className="text-xs text-white/40 leading-relaxed pl-9">{issue.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTACT SUPPORT ── */}
        <section className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/10 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-lg font-black text-white">Still stuck?</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Reach our support team and we will help you diagnose your workspace configuration.
            </p>
          </div>
          <a
            href="mailto:support@pixelmark.io"
            className="flex-shrink-0 px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-950/40 text-center"
          >
            Email Support
          </a>
        </section>

      </main>

      <footer className="border-t border-white/[0.04] py-8 text-center text-[10px] text-white/20 uppercase tracking-widest font-black">
        &copy; {new Date().getFullYear()} {seoConfig.company}. All rights reserved.
      </footer>
    </div>
  )
}
