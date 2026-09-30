'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Link2, Pin, GitPullRequest, Box, Smartphone, Edit3, 
  Lock, Check, ArrowRight, Code2, Layers
} from 'lucide-react';

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 border-t border-pm-border/40 bg-pm-surface-2/30 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-16">
        
        {/* Section Header (Section 8.5) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pm-accent">
            Core Features
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-black text-pm-text tracking-tight">
            Built for precision reviews. Nothing more.
          </h2>
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans max-w-xl mx-auto">
            Everything your team needs to review a live website, anchor feedback, and hand off fixes.
          </p>
        </div>

        {/* ── 6-ITEM ASYMMETRIC BENTO GRID (Section 8.5) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Card 1: Review links (Col Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="md:col-span-7 rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-pm-accent/30 transition-all"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-pm-text">
                Review links
              </h3>
              {/* Section 8.5 exact text */}
              <p className="text-sm text-pm-muted leading-relaxed max-w-md">
                One link opens your live page with commenting on. Add a password if you want. Works on live and staging pages at a public address.
              </p>
            </div>

            {/* Micro visual */}
            <div className="p-3 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center justify-between text-xs font-mono text-pm-text">
              <div className="flex items-center gap-2 truncate">
                <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="truncate">https://stage.entrext.com/review/acme-release</span>
              </div>
              <span className="text-[10px] text-pm-accent bg-pm-accent/10 px-2 py-0.5 rounded font-bold uppercase flex-shrink-0">
                Password protected
              </span>
            </div>
          </motion.div>

          {/* Card 2: Pin comments (Col Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="md:col-span-5 rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-pm-accent/30 transition-all"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                <Pin className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-pm-text">
                Pin comments
              </h3>
              {/* Section 8.5 exact text */}
              <p className="text-sm text-pm-muted leading-relaxed">
                Click an element to comment on it. The comment stays on that element and includes a screenshot.
              </p>
            </div>

            {/* Micro visual */}
            <div className="p-3 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-pm-accent text-white flex items-center justify-center font-mono text-xs font-bold flex-shrink-0">
                1
              </div>
              <div className="space-y-0.5 text-xs truncate">
                <div className="font-bold text-pm-text truncate">Heading padding too tight</div>
                <div className="text-[10px] font-mono text-pm-muted truncate">target: h2.hero-title + screenshot</div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Send to GitHub (Col Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="md:col-span-4 rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-pm-accent/30 transition-all"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-pm-text">
                Send to GitHub
              </h3>
              {/* Section 8.5 exact text */}
              <p className="text-sm text-pm-muted leading-relaxed">
                Turn a comment into a GitHub issue for your developer.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center justify-between text-xs font-mono">
              <span className="text-pm-text font-bold">Issue #14</span>
              <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">
                Synced
              </span>
            </div>
          </motion.div>

          {/* Card 4: 3D pages (Col Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="md:col-span-4 rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-pm-accent/30 transition-all"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-pm-text">
                3D pages
              </h3>
              {/* Section 8.5 exact text */}
              <p className="text-sm text-pm-muted leading-relaxed">
                Comment on 3D pages as well as standard pages.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-pm-surface-2 border border-pm-border text-[11px] font-mono text-pm-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>WebGL &amp; Three.js raycast support</span>
            </div>
          </motion.div>

          {/* Card 5: Phone and desktop (Col Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="md:col-span-4 rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-pm-accent/30 transition-all"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-pm-text">
                Phone and desktop
              </h3>
              {/* Section 8.5 exact text */}
              <p className="text-sm text-pm-muted leading-relaxed">
                Switch between phone and desktop size while you review. Comments keep their place.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center justify-between text-xs font-mono">
              <span className="text-pm-muted">Desktop (1440px)</span>
              <span className="text-pm-accent font-bold">Mobile (390px)</span>
            </div>
          </motion.div>

          {/* Card 6: Edit on the page (Col Span 12) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="md:col-span-12 rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-pm-accent/30 transition-all"
          >
            <div className="space-y-3 max-w-xl">
              <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-pm-text">
                Edit on the page
              </h3>
              {/* Section 8.5 exact text */}
              <p className="text-sm text-pm-muted leading-relaxed">
                Try a text or style change on the page preview and pass it to your developer. On the Team plan and above.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pm-surface-2 border border-pm-border space-y-2 text-xs font-mono max-w-xs w-full">
              <div className="flex items-center justify-between text-pm-muted text-[10px]">
                <span>LIVE CSS INSPECTOR</span>
                <span className="text-pm-accent font-bold">TEAM PLAN</span>
              </div>
              <div className="p-2 rounded-lg bg-pm-bg border border-pm-border text-[11px] text-pm-text">
                font-weight: 600; padding: 12px 24px;
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
