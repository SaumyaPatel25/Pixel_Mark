'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Zap, Globe, Layers, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import ClientDevToggleSection from '@/components/marketing/ClientDevToggleSection';
import AnimatedAppWalkthrough from '@/components/marketing/AnimatedAppWalkthrough';
import FreePlanShowcase from '@/components/marketing/FreePlanShowcase';
import LandingContactQuery from '@/components/marketing/LandingContactQuery';
import ClosingCTASection from '@/components/marketing/ClosingCTASection';
import { trackCtaClick } from '@/lib/analytics';
import { AnimatedMetricCounter } from '@/components/marketing/AnimatedMetricCounter';
import MarketingMotionBackground from '@/components/marketing/MarketingMotionBackground';

export default function ProductPageClient() {
  const handleHeroCtaClick = () => {
    trackCtaClick('product_hero_signup_cta', 'general');
  };

  return (
    <div className="relative min-h-screen bg-[var(--pm-bg)] text-[var(--pm-text)] selection:bg-[#253B80]/30 selection:text-[#1D264F] font-sans overflow-x-hidden scroll-smooth transition-colors duration-300" style={{ zoom: 0.9 }}>
      {/* Senior Motion Graphics Dynamic Background */}
      <MarketingMotionBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />

        <main className="flex-1 flex flex-col">
          {/* ============================================================ */}
          {/* HERO SECTION: Top 1% Senior Typographic & Spatial Hierarchy  */}
          {/* ============================================================ */}
          <section className="relative pt-24 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
            
            {/* Duol-Style Floating Micro-Telemetry Badges (Desktop Only) */}
            <div className="hidden xl:block absolute left-4 2xl:left-8 top-40 duol-float pointer-events-none">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 shadow-lg shadow-indigo-500/5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>ZERO_INSTALL_PROXY</span>
              </div>
            </div>

            <div className="hidden xl:block absolute right-4 2xl:right-8 top-48 duol-float-slow pointer-events-none">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 shadow-lg shadow-cyan-500/5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="duol-radar-ring absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span>0.01px_SUBPIXEL_RAYCAST</span>
              </div>
            </div>

            {/* Technical Kicker Eyebrow Pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 backdrop-blur-md text-[11px] font-mono font-medium tracking-wide uppercase text-slate-700 dark:text-slate-300 shadow-xs mb-6 sm:mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">STAGE RUNTIME</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>ZERO EXTENSIONS REQUIRED</span>
            </motion.div>

            {/* Impressive, Unified Display Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.08] sm:leading-[1.0] mb-6 sm:mb-8"
            >
              Cut Website Review Cycles by{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
                <AnimatedMetricCounter value={80} suffix="%" />
              </span>
              <span className="block mt-2 font-extrabold text-slate-700 dark:text-slate-200">
                With Instant Visual Context.
              </span>
            </motion.h1>

            {/* Clear, High-Legibility Body Copy */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl sm:max-w-3xl mx-auto leading-relaxed mb-10 sm:mb-12 font-normal px-2"
            >
              Clients click directly on live DOM nodes, 3D meshes, and copy to leave feedback. Developers get exact CSS selectors, viewport state, and network telemetry in one clean click.
            </motion.p>

            {/* Primary Call-to-Action */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="flex items-center justify-center mb-4 sm:mb-6 w-full max-w-md sm:max-w-none mx-auto"
            >
              <Link
                href="/register"
                onClick={handleHeroCtaClick}
                className="duol-shimmer-btn w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25 group min-h-[48px]"
              >
                <span>Start Reviewing Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Role Anchor Link Switcher */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mb-12 sm:mb-16"
            >
              <span>Explore Perspectives:</span>
              <a
                href="#roles"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 transition-colors"
              >
                Client View
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="#roles"
                className="hover:text-cyan-600 dark:hover:text-cyan-400 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 transition-colors"
              >
                Developer View
              </a>
            </motion.div>

            {/* Glassmorphic Bento Feature Ribbon (Replaces Generic Individual Boxes) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.38 }}
              className="max-w-5xl mx-auto rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 shadow-xl shadow-slate-900/5 dark:shadow-black/30 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200/60 dark:divide-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-left"
            >
              {/* Feature 01 */}
              <div className="p-5 sm:p-6 group hover:bg-indigo-500/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">01 // PROXY</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Zero Extensions
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Clients open a link. Works natively on Safari, Chrome, iOS & Edge without install hurdles.
                </p>
              </div>

              {/* Feature 02 */}
              <div className="p-5 sm:p-6 group hover:bg-cyan-500/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-400/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">02 // ENGINE</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Live DOM & 3D WebGL
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pin directly on interactive menus, SPAs, and Three.js 3D coordinates with automated XPath.
                </p>
              </div>

              {/* Feature 03 */}
              <div className="p-5 sm:p-6 group hover:bg-purple-500/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">03 // DIGEST</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Smart Outbox Digests
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Batched summary notifications eliminate inbox fatigue. Developers receive structured tickets.
                </p>
              </div>

              {/* Feature 04 */}
              <div className="p-5 sm:p-6 group hover:bg-emerald-500/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">04 // SLA</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Deadline Escalations
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Proactive sign-off reminders ensure feedback is addressed days before release deadlines.
                </p>
              </div>
            </motion.div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 1: Client vs Developer Perspectives                  */}
          {/* ============================================================ */}
          <div className="relative [content-visibility:auto] [contain-intrinsic-size:1px_800px]">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-800/80 to-transparent my-10 sm:my-14" />
            <ClientDevToggleSection />
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: 5-Step Animated Engine Walkthrough                */}
          {/* ============================================================ */}
          <div className="relative [content-visibility:auto] [contain-intrinsic-size:1px_900px]">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-800/80 to-transparent my-10 sm:my-14" />
            <AnimatedAppWalkthrough />
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: Free Plan Showcase & Pricing Tier                 */}
          {/* ============================================================ */}
          <div className="relative [content-visibility:auto] [contain-intrinsic-size:1px_600px]">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-800/80 to-transparent my-10 sm:my-14" />
            <FreePlanShowcase />
          </div>

          {/* ============================================================ */}
          {/* SECTION 4: Direct Query & Enterprise Inquiries               */}
          {/* ============================================================ */}
          <div className="relative [content-visibility:auto] [contain-intrinsic-size:1px_600px]">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-800/80 to-transparent my-10 sm:my-14" />
            <LandingContactQuery />
          </div>

          {/* ============================================================ */}
          {/* SECTION 5: Closing Call-to-Action                            */}
          {/* ============================================================ */}
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_500px]">
            <ClosingCTASection />
          </div>
        </main>

        <div className="[content-visibility:auto] [contain-intrinsic-size:1px_400px]">
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
