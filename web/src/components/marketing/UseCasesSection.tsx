'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, Users, MousePointer2, ShieldCheck, CheckCircle2, 
  HelpCircle, Lock, Layers, ArrowRight
} from 'lucide-react';

interface UseCasesSectionProps {
  onHoverChange?: (pos: { x: number; y: number } | null) => void;
}

export default function UseCasesSection({ onHoverChange }: UseCasesSectionProps) {
  // Section 8.6 Personas
  const personas = [
    {
      title: 'Agencies and freelancers',
      icon: Briefcase,
      text: 'Give clients one link to review a site, instead of chasing feedback across email and chat.',
      tag: 'CLIENT REVIEWS',
    },
    {
      title: 'Product and developer teams',
      icon: Users,
      text: 'Collect feedback on landing pages and releases from teammates and stakeholders, and send it to GitHub.',
      tag: 'INTERNAL QA',
    },
    {
      title: 'Clients and reviewers',
      icon: MousePointer2,
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
    <section id="who-it-is-for" className="py-24 md:py-32 border-t border-pm-border/40 bg-pm-bg relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-20">
        
        {/* ── SECTION 8.6: WHO IT IS FOR ── */}
        <div className="space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pm-accent">
              Audiences
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-black text-pm-text tracking-tight">
              Built for everyone in the review loop.
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
                  className="rounded-3xl border border-pm-border bg-pm-surface p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-pm-accent/30 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-pm-accent/10 text-pm-accent flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pm-muted">
                        {p.tag}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-pm-text">
                      {p.title}
                    </h3>

                    {/* Section 8.6 exact text */}
                    <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                      {p.text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-pm-border/60 flex items-center gap-1.5 text-[11px] font-mono font-bold text-pm-accent">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified workflow</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 8.7: USE CASES & WHAT STAGE IS NOT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-6">
          
          {/* Left Column: 4 Real Use Cases (Cols 6) */}
          <div className="lg:col-span-6 rounded-3xl border border-pm-border bg-pm-surface p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pm-accent">
                Common Scenarios
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight">
                When teams reach for STAGE
              </h3>
            </div>

            <div className="space-y-3">
              {useCases.map((uc, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center gap-3 text-xs sm:text-sm text-pm-text">
                  <div className="w-6 h-6 rounded-full bg-pm-accent/10 text-pm-accent flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <span>{uc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: "What STAGE is not" Honest Boundary Card (Cols 6) */}
          <div className="lg:col-span-6 rounded-3xl border border-pm-border bg-pm-surface p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-500">
                Honest Positioning
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight">
                What STAGE is not
              </h3>
              
              {/* Section 8.7 exact text */}
              <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                STAGE is for reviewing websites and passing fixes to your developer. It is not a project management tool or a design tool. Keep using your task tool for tasks and Figma for design. STAGE starts when the page is built.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-pm-text font-bold">Design in Figma</span>
                <span className="text-pm-muted">→</span>
                <span className="text-pm-text font-bold">Build Site</span>
                <span className="text-pm-muted">→</span>
                <span className="text-pm-accent font-bold">Review in STAGE</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── SECTION 8.8: ACCESS AND PRIVACY ── */}
        <div className="rounded-3xl border border-pm-border bg-pm-surface-2/40 p-8 sm:p-10 space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pm-accent">
              Access &amp; Privacy
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight">
              Who can see your review
            </h3>
          </div>

          {/* Section 8.8 exact text */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-pm-muted">
            <div className="p-4 rounded-2xl bg-pm-surface border border-pm-border space-y-2">
              <div className="font-bold text-pm-text flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Link Access</span>
              </div>
              <p className="leading-relaxed">
                Only people with your review link can open it. You can add a password to any link.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pm-surface border border-pm-border space-y-2">
              <div className="font-bold text-pm-text flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pm-accent" />
                <span>Network Scope</span>
              </div>
              <p className="leading-relaxed">
                STAGE opens web addresses that anyone can reach. It cannot open private networks or localhost.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pm-surface border border-pm-border space-y-2">
              <div className="font-bold text-pm-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Data Control</span>
              </div>
              <p className="leading-relaxed">
                You can delete a project and all of its comments at any time.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
