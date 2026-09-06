'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { trackCtaClick } from '@/lib/analytics';

const FREE_FEATURES = [
  '1 Active project with unlimited comment pins',
  'Zero-install review links for unlimited clients',
  'Exact CSS selectors & device screen sizes',
  'Real-time live cursors & teammate presence',
  'Smart email summaries (no notification spam)',
  'Standard bug exports (Markdown & JSON)',
  'No credit card needed · Free forever'
];

export default function FreePlanShowcase() {
  const handleFreeCtaClick = () => {
    trackCtaClick('free_plan_showcase_cta', 'general');
  };

  return (
    <section id="pricing-free" className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      <div className="relative rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 lg:p-14 overflow-hidden shadow-lg dark:shadow-2xl">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Plan Value Pitch */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              100% Free Forever Plan
            </div>

            <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Start Free. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">Upgrade only when you grow.</span>
            </h3>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              We want every client, freelancer, and engineering team to experience friction-free website review. Our Free Plan includes unlimited comment pins, live interactive website review, and shareable links.
            </p>

            {/* Feature Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              {FREE_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Pricing Box Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-5 sm:space-y-6 shadow-md dark:shadow-xl backdrop-blur-xl relative">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  STAGE Starter Plan
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">/ month</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Free Forever · No Credit Card Required
                </p>
              </div>

              <div className="pt-1">
                <Link
                  href="/register"
                  onClick={handleFreeCtaClick}
                  className="duol-shimmer-btn w-full inline-flex items-center justify-center gap-2.5 py-3.5 sm:py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-500/20 group min-h-[48px]"
                >
                  Create Your Free Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Ready in under 30 seconds
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-around text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Unlimited Reviewers</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Private & Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
