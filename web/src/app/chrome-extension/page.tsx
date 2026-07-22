import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/marketing/PublicHeader'
import WaitlistForm from '@/components/chrome-extension/WaitlistForm'
import { seoConfig } from '@/lib/seoConfig'
import { Check, Clock3 } from 'lucide-react'

export const metadata: Metadata = {
  title: "Chrome Extension — STAGE",
  description:
    "The STAGE Chrome Extension lets you review and annotate any website without installing code. Hover to inspect, click to mark, and export feedback in seconds.",
  alternates: {
    canonical: `${seoConfig.siteUrl}/chrome-extension`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Chrome Extension — STAGE",
    description:
      "Review and annotate any website without installing code. Hover to inspect, click to mark, export feedback in seconds.",
    type: 'website',
    url: `${seoConfig.siteUrl}/chrome-extension`,
  },
}

const featureList = [
  'Hover to highlight any element',
  'Shift+click to add a feedback marker',
  'Capture DOM context, XPath, and computed styles automatically',
  'Works on any public or private website',
  'Syncs to your STAGE dashboard in real time',
]

export default function ChromeExtensionPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'STAGE Chrome Extension',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Chrome',
    description:
      'Visual website review tool that works on any page directly from your browser. No code required.',
    url: `${seoConfig.siteUrl}/chrome-extension`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans selection:bg-purple-500/30 relative overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Dot-grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.14]"
        style={{
          backgroundImage: 'radial-gradient(circle, #7c3aed 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-purple-700/10 blur-[100px] pointer-events-none z-0" />

      <PublicHeader />

      <main className="max-w-4xl mx-auto px-5 md:px-8 py-14 space-y-20 relative z-10">

        {/* ── HERO ── */}
        <section className="text-center space-y-7">
          {/* Styled Coming Soon badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/15 border border-purple-500/30 text-[11px] font-black uppercase tracking-widest text-purple-300 shadow-lg shadow-purple-900/20">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Coming Soon
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.02]">
            Visual Website Review —{' '}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Anywhere
            </span>
          </h1>

          <p className="text-pm-muted text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            The STAGE Chrome Extension is in development. Install it to review any website directly from
            your browser — no code required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#notify"
              className="px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-900/30"
            >
              Notify Me When It Launches
            </a>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl border border-pm-border hover:border-pm-border-bright text-pm-muted hover:text-pm-text font-bold text-xs transition-all"
            >
              Go to Dashboard →
            </Link>
          </div>
        </section>

        {/* ── FEATURE PREVIEW LIST ── */}
        <section className="space-y-7">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-center">What it will do</h2>
            <p className="text-xs text-pm-muted/50 font-bold uppercase tracking-wider text-center">
              Everything you need for browser-native feedback
            </p>
          </div>

          <div className="bg-pm-surface border border-pm-border rounded-2xl p-7 md:p-10 space-y-5 shadow-xl max-w-2xl mx-auto w-full">
            {featureList.map((feat, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                </span>
                <p className="text-sm text-pm-text leading-relaxed">{feat}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── NOTIFY ME FORM ── */}
        <section id="notify" className="max-w-2xl mx-auto w-full space-y-6 scroll-mt-20">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight">Get Notified</h2>
            <p className="text-xs text-pm-muted/50 font-bold uppercase tracking-wider">
              Be first in line when the beta opens
            </p>
          </div>

          {/* WaitlistForm is a client component */}
          <WaitlistForm />
        </section>

        {/* ── TIMELINE NOTE ── */}
        <section className="max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-4 bg-pm-surface border border-pm-border rounded-2xl px-6 py-5">
            <Clock3 className="w-5 h-5 text-pm-muted/30 flex-shrink-0" />
            <p className="text-xs text-pm-muted/50 leading-relaxed">
              <span className="text-pm-text font-bold">Estimated Q3 2026.</span>{' '}
              Currently in active development. The core marker injection engine and real-time sync are complete.
            </p>
          </div>
        </section>

      </main>

      <footer className="border-t border-pm-border py-8 text-center text-[10px] text-pm-muted/40 uppercase tracking-widest font-black">
        &copy; {new Date().getFullYear()} {seoConfig.company}. All rights reserved.
      </footer>
    </div>
  )
}
