'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Link2, Pin, GitPullRequest, Box, Smartphone, Edit3, 
  Lock
} from 'lucide-react';

export default function FeaturesSection() {
  return (
    <section id="features" className="py-28 md:py-36 border-t border-pm-border/40 bg-[var(--pm-bg)] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-16">
        
        {/* Section Header (Section 8.5) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
            Core Features
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-[1.1]">
            Built for precision reviews.{' '}
            <span className="font-serif italic font-normal text-[#2B4CFF] dark:text-[#7C97FF]">
              Nothing more.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans max-w-xl mx-auto">
            Everything your team needs to review a live website, anchor feedback, and hand off fixes.
          </p>
        </div>

        {/* ── 6-ITEM ASYMMETRIC BENTO GRID (Section 8.5) WITH DOUBLE BEZEL & PASTELS ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Card 1: Review links (Col Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="md:col-span-7 p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
          >
            <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#EBF1FE] text-[#1A73E8] border border-[#D2E3FC] flex items-center justify-center shadow-2xs">
                  <Link2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#16141A] dark:text-white">
                  Review links
                </h3>
                <p className="text-sm text-pm-muted leading-relaxed max-w-md font-sans">
                  One link opens your live page with commenting on. Add a password if you want. Works on live and staging pages at a public address.
                </p>
              </div>

              {/* Micro visual */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-mono text-[#16141A] dark:text-white">
                <div className="flex items-center gap-2 truncate">
                  <Lock className="w-3.5 h-3.5 text-[#137333] shrink-0" />
                  <span className="truncate">https://stage.entrext.com/review/acme-release</span>
                </div>
                <span className="text-[10px] text-[#1A73E8] bg-[#EBF1FE] border border-[#D2E3FC] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                  Password protected
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Pin comments (Col Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="md:col-span-5 p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
          >
            <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FCE7E4] text-[#E8615A] border border-[#FCE7E4] flex items-center justify-center shadow-2xs">
                  <Pin className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#16141A] dark:text-white">
                  Pin comments
                </h3>
                <p className="text-sm text-pm-muted leading-relaxed font-sans">
                  Click an element to comment on it. The comment stays on that element and includes a screenshot.
                </p>
              </div>

              {/* Micro visual */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#E8615A] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">
                  1
                </div>
                <div className="space-y-0.5 text-xs truncate font-sans">
                  <div className="font-semibold text-[#16141A] dark:text-white truncate">Heading padding too tight</div>
                  <div className="text-[10px] font-mono text-pm-muted truncate">target: h2.hero-title + screenshot</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Send to GitHub (Col Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="md:col-span-4 p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
          >
            <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#ECE6F6] text-[#4A154B] dark:text-[#E8D9F7] border border-[#ECE6F6] flex items-center justify-center shadow-2xs">
                  <GitPullRequest className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                  Send to GitHub
                </h3>
                <p className="text-sm text-pm-muted leading-relaxed font-sans">
                  Turn a comment into a GitHub issue for your developer.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-[#16141A] dark:text-white font-semibold">Issue #14</span>
                <span className="text-[#137333] bg-[#E6F4EA] border border-[#CEEAD6] px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Synced
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 4: 3D pages (Col Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="md:col-span-4 p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
          >
            <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#E2F3F5] text-[#007A87] border border-[#E2F3F5] flex items-center justify-center shadow-2xs">
                  <Box className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                  3D pages
                </h3>
                <p className="text-sm text-pm-muted leading-relaxed font-sans">
                  Comment on 3D pages as well as standard pages.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono text-pm-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#007A87]" />
                <span>WebGL &amp; Three.js raycast support</span>
              </div>
            </div>
          </motion.div>

          {/* Card 5: Phone and desktop (Col Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="md:col-span-4 p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
          >
            <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF3E2] text-[#B06000] border border-[#FEF3E2] flex items-center justify-center shadow-2xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                  Phone and desktop
                </h3>
                <p className="text-sm text-pm-muted leading-relaxed font-sans">
                  Switch between phone and desktop size while you review. Comments keep their place.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-pm-muted">Desktop (1440px)</span>
                <span className="text-[#B06000] bg-[#FEF3E2] px-2 py-0.5 rounded-full font-bold">Mobile (390px)</span>
              </div>
            </div>
          </motion.div>

          {/* Card 6: Edit on the page (Col Span 12) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="md:col-span-12 p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
          >
            <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="w-11 h-11 rounded-2xl bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center justify-center shadow-2xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#16141A] dark:text-white">
                  Edit on the page
                </h3>
                <p className="text-sm text-pm-muted leading-relaxed font-sans">
                  Try a text or style change on the page preview and pass it to your developer. On the Team plan and above.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs font-mono max-w-xs w-full">
                <div className="flex items-center justify-between text-pm-muted text-[10px]">
                  <span>LIVE CSS INSPECTOR</span>
                  <span className="text-[#137333] bg-[#E6F4EA] border border-[#CEEAD6] px-2 py-0.5 rounded-full font-bold">TEAM PLAN</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#131217] border border-slate-200 dark:border-white/10 text-[11px] text-[#16141A] dark:text-white">
                  font-weight: 600; padding: 12px 24px;
                </div>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
