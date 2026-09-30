'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ImageOff, MessageSquareX, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ProblemSection() {
  const painPoints = [
    {
      icon: ImageOff,
      title: 'Screenshots do not say which page or device.',
      description:
        'A screenshot in chat does not show the URL, screen resolution, browser version, or computed CSS. Developers have to guess what viewport was used.',
      badExample: 'WhatsApp image · "The button looks cut off here"',
      goodSolution: 'STAGE captures the live URL, viewport dimensions, and DOM selector automatically.',
    },
    {
      icon: MessageSquareX,
      title: 'Chat threads bury the decision.',
      description:
        'Feedback scattered across Slack, WhatsApp, and email threads gets lost. Important client decisions get overwritten or forgotten between meetings.',
      badExample: 'Slack thread #general · 48 replies · "Wait, did we approve this font?"',
      goodSolution: 'One review link keeps every comment attached to the live element with a timestamp and author.',
    },
    {
      icon: RotateCcw,
      title: 'Vague notes cause extra rounds of changes.',
      description:
        'Messages like "make it cleaner" or "shift this a bit" result in 3 to 5 extra revision loops because no one knows which exact element was meant.',
      badExample: 'Email note · "Move the header down a bit and make it pop"',
      goodSolution: 'The client clicks the exact button or heading. Your developer sees the exact element highlighted.',
    },
  ];

  return (
    <section id="problem-section" className="py-24 md:py-32 border-t border-pm-border/40 bg-pm-surface-2/40 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-16">
        
        {/* Section Header (Section 8.3) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pm-accent">
            The Problem
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-pm-text tracking-tight leading-tight">
            Website feedback gets lost before it reaches the developer.
          </h2>
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans">
            It arrives as screenshots in chat, notes in email, and messages like &ldquo;make it cleaner.&rdquo; Your team then spends hours working out which page, which element and which screen the person meant.
          </p>
        </div>

        {/* 3 High-Contrast Pain Cards (Section 8.3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {painPoints.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="rounded-3xl border border-pm-border bg-pm-surface p-7 shadow-xs hover:border-pm-accent/30 transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-pm-text leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Before vs After Micro-Visual */}
                <div className="space-y-2 pt-2 border-t border-pm-border/60">
                  <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15 text-[11px] font-mono text-rose-600 dark:text-rose-400 flex items-start gap-2">
                    <span className="font-bold flex-shrink-0">❌</span>
                    <span className="truncate">{item.badExample}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{item.goodSolution}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
