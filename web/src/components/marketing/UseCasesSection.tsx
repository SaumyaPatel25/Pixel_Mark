'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, Users, MousePointer2, ShieldCheck, CheckCircle2, 
  Lock
} from 'lucide-react';

export default function UseCasesSection() {
  // Section 8.6 Personas
  const personas = [
    {
      title: 'Agencies and freelancers',
      icon: Briefcase,
      pastelBg: 'bg-[#EBF1FE] dark:bg-[#1A73E8]/15 text-[#1A73E8] dark:text-[#8AB4F8] border-[#D2E3FC] dark:border-[#1A73E8]/30',
      text: 'Give clients one link to review a site, instead of chasing feedback across email and chat.',
      tag: 'CLIENT REVIEWS',
    },
    {
      title: 'Product and developer teams',
      icon: Users,
      pastelBg: 'bg-[#ECE6F6] dark:bg-[#7C4DFF]/15 text-[#4A154B] dark:text-[#D1C4E9] border-[#ECE6F6] dark:border-[#7C4DFF]/30',
      text: 'Collect feedback on landing pages and releases from teammates and stakeholders, and send it to GitHub.',
      tag: 'INTERNAL QA',
    },
    {
      title: 'Clients and reviewers',
      icon: MousePointer2,
      pastelBg: 'bg-[#E6F4EA] dark:bg-[#137333]/15 text-[#137333] dark:text-[#A7F3D0] border-[#CEEAD6] dark:border-[#137333]/30',
      text: 'Click, type, done. Nothing to install.',
      tag: 'ZERO ONBOARDING',
    },
  ];

  // Section 8.7 Use Cases
  const useCases = [
    'A client reviews a new website before launch.',
    'A startup team collects feedback on a landing page.',
    'A designer checks a built page against the design.',
    'A developer gets comments tied to the exact element instead of screenshots.',
  ];

  return (
    <section id="who-it-is-for" className="py-28 md:py-36 border-t border-pm-border/40 bg-[var(--pm-bg)] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-20">
        
        {/* ── SECTION 8.6: WHO IT IS FOR ── */}
        <div className="space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
              Audiences
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-[1.1]">
              Built for everyone in the{' '}
              <span className="font-serif italic font-normal text-[#2B4CFF] dark:text-[#7C97FF]">
                review loop.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans max-w-xl mx-auto">
              Eliminate miscommunication whether you are building the website or signing off on it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((p, idx) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="p-1.5 rounded-[2rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 hover:border-[#2B4CFF]/30 transition-all shadow-xs"
                >
                  <div className="p-8 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`w-11 h-11 rounded-2xl ${p.pastelBg} border flex items-center justify-center shadow-2xs`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-pm-muted bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                          {p.tag}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                        {p.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                        {p.text}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#2B4CFF]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified workflow</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 8.7: USE CASES & WHAT STAGE IS NOT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4">
          
          {/* Left Column: 4 Real Use Cases (Cols 6) */}
          <div className="lg:col-span-6 p-1.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 shadow-xs">
            <div className="p-8 rounded-[1.875rem] bg-white dark:bg-[#16141A] h-full space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
                  Common Scenarios
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight">
                  When teams reach for STAGE
                </h3>
              </div>

              <div className="space-y-3 font-sans">
                {useCases.map((uc, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center gap-3 text-xs sm:text-sm text-[#16141A] dark:text-white">
                    <div className="w-6 h-6 rounded-full bg-[#EBF1FE] text-[#1A73E8] flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span>{uc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: "What STAGE is not" Honest Boundary Card (Cols 6) */}
          <div className="lg:col-span-6 p-1.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 shadow-xs">
            <div className="p-8 rounded-[1.875rem] bg-white dark:bg-[#16141A] h-full space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#9E2A2B] bg-[#FCE7E4] border border-[#FCE7E4] px-3 py-1 rounded-full inline-block">
                  Honest Positioning
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight">
                  What STAGE is not
                </h3>
                
                <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans pt-1">
                  STAGE is for reviewing websites and passing fixes to your developer. It is not a project management tool or a design tool. Keep using your task tool for tasks and Figma for design. STAGE starts when the page is built.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#16141A] dark:text-white font-semibold">Design in Figma</span>
                  <span className="text-pm-muted">→</span>
                  <span className="text-[#16141A] dark:text-white font-semibold">Build Site</span>
                  <span className="text-pm-muted">→</span>
                  <span className="text-[#2B4CFF] font-bold">Review in STAGE</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── SECTION 8.8: ACCESS AND PRIVACY ── */}
        <div className="p-2 sm:p-2.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 shadow-xs">
          <div className="rounded-[1.875rem] bg-white dark:bg-[#16141A] p-8 sm:p-10 space-y-6">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
                Access &amp; Privacy
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight">
                Who can see your review
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-pm-muted font-sans">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#137333]" />
                  <span>Link Access</span>
                </div>
                <p className="leading-relaxed">
                  Only people with your review link can open it. You can add a password to any link.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2B4CFF]" />
                  <span>Network Scope</span>
                </div>
                <p className="leading-relaxed">
                  STAGE opens web addresses that anyone can reach. It cannot open private networks or localhost.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                  <span>Data Control</span>
                </div>
                <p className="leading-relaxed">
                  You can delete a project and all of its comments at any time.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
