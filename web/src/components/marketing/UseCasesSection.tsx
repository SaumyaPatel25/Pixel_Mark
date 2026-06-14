'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function UseCasesSection() {
  const [activeTab, setActiveTab] = useState<'freelancers' | 'teams' | 'agencies'>('freelancers');

  const useCases = {
    freelancers: {
      icon: User,
      title: 'Speed up client sign-offs',
      subtitle: 'For Freelance Designers & Web Developers',
      description: 'Stop deciphering vague client emails and messages. Send them a secure share link, let them drop pins right on the elements they want tweaked, and receive actionable tickets with exact selectors.',
      bullets: [
        'Collect visual change requests with 0 account setup for clients',
        'Direct link to exact element selector prevents alignment confusion',
        'Eliminate back-and-forth email chains with a single source of truth'
      ],
      cta: 'Start Freelancing Faster'
    },
    teams: {
      icon: Users,
      title: 'QA testing with developer-ready context',
      subtitle: 'For Product Managers, QAs, & Engineering Teams',
      description: 'Streamline your internal QA cycles. Non-technical testers and product managers can drop pins to log bugs, and the engine automatically packages console errors, network failures, and DOM snapshots.',
      bullets: [
        'Automatic capturing of JavaScript errors and CORS exceptions',
        'Direct markdown or GitHub export format cuts ticket logging time',
        'Resilient waterfall selector tracking across git branch merges'
      ],
      cta: 'Scale Your QA Loop'
    },
    agencies: {
      icon: Briefcase,
      title: 'Professional stakeholder reviews',
      subtitle: 'For Design, Development, & Creative Agencies',
      description: 'Present a polished, high-tech feedback portal to your clients. Group comments by target URL paths, track severity states (Critical, Medium, Low), and sync feedback cards directly with project managers.',
      bullets: [
        'Secure obfuscated share links match professional delivery workflows',
        'Collocated reviewer sync displays live updates across client teams',
        'Filter review feed by active pages to resolve multi-route feedback'
      ],
      cta: 'Upgrade Client Hand-offs'
    }
  };

  const currentCase = useCases[activeTab];

  return (
    <section className="relative py-24 bg-pm-bg overflow-hidden border-t border-pm-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
            Use Cases
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white animate-fade-in">
            Tailored for your review workflow
          </h2>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center border-b border-pm-border max-w-md mx-auto mb-12">
          {(['freelancers', 'teams', 'agencies'] as const).map((tab) => {
            const label = tab === 'freelancers' ? 'Freelancers' : tab === 'teams' ? 'Product & QA' : 'Agencies';
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 pb-3 text-xs font-bold uppercase tracking-widest text-center relative transition-colors duration-200"
                style={{ color: isActive ? 'var(--pm-text)' : 'var(--pm-text-muted)' }}
              >
                {label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-pm-accent"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="max-w-5xl mx-auto min-h-[360px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            >
              {/* Card Text Content */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                    <currentCase.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-pm-muted">
                      {currentCase.subtitle}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white leading-tight">
                      {currentCase.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-pm-muted leading-relaxed">
                  {currentCase.description}
                </p>

                <div className="space-y-3 pt-2">
                  {currentCase.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-left">
                      <CheckCircle2 className="w-4 h-4 text-pm-cyan flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-pm-text leading-normal">{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-pm-surface-2 border border-pm-border hover:border-pm-accent/30 rounded-lg text-xs font-bold uppercase tracking-widest text-pm-text hover:text-white transition-all"
                  >
                    {currentCase.cta}
                    <ArrowUpRight className="w-4 h-4 text-pm-accent-vivid" />
                  </Link>
                </div>
              </div>

              {/* Graphic Mock Showcase */}
              <div className="lg:col-span-5 p-6 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden flex flex-col gap-4 font-mono text-[9px] text-pm-text select-none">
                <div className="flex items-center justify-between border-b border-pm-border/30 pb-2">
                  <span className="text-white font-bold">WORKFLOW HIGHLIGHT</span>
                  <span className="text-pm-cyan">SYNCED</span>
                </div>

                {activeTab === 'freelancers' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded bg-pm-bg border border-pm-border space-y-1">
                      <div className="text-pm-accent-vivid font-bold">Feedback ID: pm_feedback_1a3b</div>
                      <div className="text-white">"Can we change the button text to 'Launch Sandbox'?"</div>
                    </div>
                    <div className="flex justify-between items-center bg-pm-bg p-3 rounded border border-pm-border">
                      <span className="text-pm-muted">Resolution State</span>
                      <span className="text-pm-cyan">Awaiting Dev Approval</span>
                    </div>
                  </div>
                )}

                {activeTab === 'teams' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded bg-pm-bg border border-pm-border space-y-1.5">
                      <div className="text-red-400 font-bold">CORS ERRORS CAPTURED (1)</div>
                      <div className="text-pm-muted text-[8px] break-all leading-normal">
                        Access to font at 'https://cdn.com/f.woff2' from origin 'app' has been blocked by CORS policy.
                      </div>
                    </div>
                    <div className="p-3 rounded bg-pm-bg border border-pm-border">
                      <span className="text-pm-cyan block mb-1">Target Element XPath</span>
                      <span className="text-pm-muted text-[8px] break-all">/html/body/main/div[2]/h1</span>
                    </div>
                  </div>
                )}

                {activeTab === 'agencies' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded bg-pm-bg border border-pm-border space-y-1">
                      <div className="text-pm-accent-vivid font-bold">Project Workspace Summary</div>
                      <div className="flex justify-between">
                        <span>Total Sessions:</span>
                        <span className="text-white">12 active</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Feedback Pins:</span>
                        <span className="text-white">43 resolved / 12 open</span>
                      </div>
                    </div>
                    <div className="p-3 rounded bg-pm-bg border border-pm-border flex justify-between">
                      <span>Reviewer Status:</span>
                      <span className="text-pm-cyan">White-Labeled Active</span>
                    </div>
                  </div>
                )}

                <div className="text-[7px] text-pm-muted/30 uppercase tracking-widest text-right mt-2">
                  [Session context: verified]
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

const ArrowUpRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"></line>
    <polyline points="7 7 17 7 17 17"></polyline>
  </svg>
);
