'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ImageOff, MessageSquareX, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function ProblemSection() {
  const painPoints = [
    {
      icon: ImageOff,
      pastelBg: 'bg-[#FCE7E4] dark:bg-[#E8615A]/15 border-[#FCE7E4] dark:border-[#E8615A]/30 text-[#E8615A] dark:text-[#FFA49C]',
      title: 'Screenshots do not say which page or device.',
      description:
        'A screenshot in chat does not show the URL, screen resolution, browser version, or computed CSS. Developers have to guess what viewport was used.',
      badExample: 'WhatsApp image · "The button looks cut off here"',
      goodSolution: 'STAGE captures the live URL, viewport dimensions, and DOM selector automatically.',
    },
    {
      icon: MessageSquareX,
      pastelBg: 'bg-[#FEF3E2] dark:bg-[#B06000]/15 border-[#FEF3E2] dark:border-[#B06000]/30 text-[#B06000] dark:text-[#FDE68A]',
      title: 'Chat threads bury the decision.',
      description:
        'Feedback scattered across Slack, WhatsApp, and email threads gets lost. Important client decisions get overwritten or forgotten between meetings.',
      badExample: 'Slack thread #general · 48 replies · "Wait, did we approve this font?"',
      goodSolution: 'One review link keeps every comment attached to the live element with a timestamp and author.',
    },
    {
      icon: RotateCcw,
      pastelBg: 'bg-[#ECE6F6] dark:bg-[#7C4DFF]/15 border-[#ECE6F6] dark:border-[#7C4DFF]/30 text-[#4A154B] dark:text-[#D1C4E9]',
      title: 'Vague notes cause extra rounds of changes.',
      description:
        'Messages like "make it cleaner" or "shift this a bit" result in 3 to 5 extra revision loops because no one knows which exact element was meant.',
      badExample: 'Email note · "Move the header down a bit and make it pop"',
      goodSolution: 'The client clicks the exact button or heading. Your developer sees the exact element highlighted.',
    },
  ];

  return (
    <section id="problem-section" className="py-28 md:py-36 border-t border-pm-border/40 bg-[var(--pm-bg)] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-16">
        
        {/* Section Header (Section 8.3) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#E8615A] dark:text-[#FFA49C] bg-[#FCE7E4] dark:bg-[#E8615A]/20 px-3 py-1 rounded-full inline-block">
            The Problem
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-[1.1]">
            Website feedback gets lost{' '}
            <span className="font-serif italic font-normal text-[#E8615A] dark:text-[#FFA49C]">
              before it reaches the developer.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans max-w-2xl mx-auto">
            It arrives as screenshots in chat, notes in email, and messages like &ldquo;make it cleaner.&rdquo; Your team then spends hours working out which page, which element and which screen the person meant.
          </p>
        </div>

        {/* 3 High-Contrast Pain Cards with Double-Bezel Architecture */}
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
                className="p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs group"
              >
                <div className="p-6 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className={`w-11 h-11 rounded-2xl ${item.pastelBg} border flex items-center justify-center shadow-2xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-[#16141A] dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>

                  {/* Before vs After Micro-Visual */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 font-sans">
                    <div className="p-2.5 rounded-xl bg-[#FCE7E4]/50 dark:bg-[#9E2A2B]/20 border border-[#FCE7E4] dark:border-[#9E2A2B]/40 text-[11px] font-mono text-[#9E2A2B] dark:text-[#FFA49C] flex items-start gap-2">
                      <span className="font-bold shrink-0">✕</span>
                      <span className="truncate">{item.badExample}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#E6F4EA]/60 dark:bg-[#137333]/20 border border-[#CEEAD6] dark:border-[#137333]/40 text-[11px] font-mono text-[#137333] dark:text-[#A7F3D0] flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#137333] dark:text-[#68D391] shrink-0 mt-0.5" />
                      <span className="leading-snug">{item.goodSolution}</span>
                    </div>
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
