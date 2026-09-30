'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, MessageSquare, Check, ArrowRight, 
  Copy, Lock, GitPullRequest, Code2
} from 'lucide-react';

interface HowItWorksStep {
  stepNumber: string;
  name: string;
  headline: string;
  description: string;
  pastel: {
    badge: string;
    text: string;
    border: string;
    stepBg: string;
  };
}

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [fixedState, setFixedState] = useState(false);
  const [githubExported, setGithubExported] = useState(false);

  // Section 8.4 Exact Text & Curated Pastel Metadata
  const steps: HowItWorksStep[] = [
    {
      stepNumber: '1',
      name: 'Share',
      headline: 'Create and send a review link.',
      description:
        'Paste your website address and create a review link. Send it to your client or team. The address cannot be changed later. To review another site, create a new project.',
      pastel: {
        badge: 'bg-[#EBF1FE]',
        text: 'text-[#1A73E8]',
        border: 'border-[#D2E3FC]',
        stepBg: 'bg-[#1A73E8]',
      },
    },
    {
      stepNumber: '2',
      name: 'Review',
      headline: 'Clients click directly on the live page.',
      description:
        'Reviewers open the link and click anywhere on the page to leave a comment. Nothing to install.',
      pastel: {
        badge: 'bg-[#ECE6F6]',
        text: 'text-[#4A154B] dark:text-[#E8D9F7]',
        border: 'border-[#ECE6F6]',
        stepBg: 'bg-[#7C4DFF]',
      },
    },
    {
      stepNumber: '3',
      name: 'Fix',
      headline: 'See exact elements and resolve fixes.',
      description:
        'Your team sees each comment on the exact element, with a screenshot. Mark it Fixed, or send it to GitHub as an issue.',
      pastel: {
        badge: 'bg-[#E6F4EA]',
        text: 'text-[#137333]',
        border: 'border-[#CEEAD6]',
        stepBg: 'bg-[#137333]',
      },
    },
  ];

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <section id="how-it-works" className="py-28 md:py-36 border-t border-pm-border/40 bg-[var(--pm-bg)] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-16">
        
        {/* Section Header (Section 8.4) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
            How It Works
          </span>
          <h2 className="text-4xl sm:text-6xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-[1.05]">
            Share.{' '}
            <span className="font-serif italic font-normal text-[#2B4CFF] dark:text-[#7C97FF]">
              Review.
            </span>{' '}
            Fix.
          </h2>
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans max-w-xl mx-auto">
            Three simple steps between client feedback and verified developer fixes.
          </p>
        </div>

        {/* 3 Interactive Horizontal Steps Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s, idx) => {
            const stepIndex = idx + 1;
            const isActive = activeStep === stepIndex;

            return (
              <button
                key={stepIndex}
                type="button"
                onClick={() => setActiveStep(stepIndex)}
                className={`p-1.5 rounded-[2rem] border transition-all duration-200 text-left cursor-pointer ${
                  isActive
                    ? 'bg-slate-900/[0.04] dark:bg-white/[0.05] border-[#2B4CFF]/40 shadow-md ring-2 ring-[#2B4CFF]/20'
                    : 'bg-transparent border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="p-6 rounded-[1.625rem] bg-white dark:bg-[#16141A] h-full flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#16141A] text-white dark:bg-white dark:text-[#16141A]'
                          : 'bg-slate-100 dark:bg-white/10 text-pm-muted'
                      }`}
                    >
                      {s.stepNumber}
                    </span>
                    <span className={`text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${s.pastel.badge} ${s.pastel.text}`}>
                      Step 0{stepIndex}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <h3 className="text-lg font-bold text-[#16141A] dark:text-white">
                      {s.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── INTERACTIVE STEP DETAIL DEMONSTRATION WITH DOUBLE BEZEL ── */}
        <div className="p-2 sm:p-2.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-lg">
          <div className="rounded-[1.875rem] bg-white dark:bg-[#16141A] p-6 sm:p-10 border border-slate-200/60 dark:border-white/5 relative overflow-hidden">
            
            <AnimatePresence mode="wait">
              
              {/* STEP 1: SHARE DEMO */}
              {activeStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4 text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF1FE] text-[#1A73E8] border border-[#D2E3FC] text-[11px] font-mono font-semibold">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Step 1 · Share</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-snug">
                      Instant link generation with zero login walls for your client.
                    </h3>
                    <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                      Paste your live or staging URL. STAGE creates an encrypted review link that works across all modern browsers. You can optionally add a review password.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] font-mono text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer shadow-xs"
                      >
                        <span>Proceed to Step 2</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Step 1 Visual Card */}
                  <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-4">
                    <div className="text-xs font-mono font-semibold text-[#16141A] dark:text-white uppercase tracking-wider flex items-center justify-between">
                      <span>Generated Review Link</span>
                      <span className="text-[10px] text-[#137333] bg-[#E6F4EA] border border-[#CEEAD6] px-2 py-0.5 rounded-full font-bold">
                        Ready to share
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#131217] border border-slate-200 dark:border-white/10">
                      <Lock className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
                      <span className="text-xs font-mono text-[#16141A] dark:text-white truncate flex-1 select-all">
                        https://stage.entrext.com/review/acme-staging-88fa
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 rounded-lg bg-[#2B4CFF] hover:bg-[#203ecc] text-white font-mono text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FEF3E2] border border-[#FEF3E2] text-[11px] font-mono text-[#B06000]">
                      💡 The website address cannot be changed after you create the project. To review a different site, create a new project.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: REVIEW DEMO */}
              {activeStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4 text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECE6F6] text-[#4A154B] dark:text-[#E8D9F7] text-[11px] font-mono font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Step 2 · Review</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-snug">
                      Point, click, and explain. Your client installs nothing.
                    </h3>
                    <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                      Reviewers enter their name once and can immediately drop comments anywhere on the page. Every pin stays anchored to the exact CSS selector even when the window resizes.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep(3)}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] font-mono text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer shadow-xs"
                      >
                        <span>Proceed to Step 3</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Step 2 Visual Card */}
                  <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
                    <div className="p-4 rounded-xl bg-white dark:bg-[#131217] border border-slate-200 dark:border-white/10 space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                        <span className="text-[10px] font-mono font-semibold text-pm-muted">Target Site Preview</span>
                        <span className="text-[9px] font-mono bg-[#EBF1FE] text-[#1A73E8] px-2 py-0.5 rounded-full font-bold">
                          Comment Mode Active
                        </span>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-dashed border-[#2B4CFF]/40 relative">
                        <div className="space-y-2">
                          <div className="w-24 h-2.5 rounded bg-slate-300 dark:bg-white/20" />
                          <div className="w-48 h-4 rounded bg-slate-700 dark:bg-white/80 font-bold" />
                        </div>

                        {/* Click Pin #1 */}
                        <div className="absolute top-2 right-4 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#2B4CFF] text-white flex items-center justify-center font-mono text-xs font-bold shadow-md ring-4 ring-[#2B4CFF]/20">
                            1
                          </div>
                        </div>
                      </div>

                      {/* Popover */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left space-y-1.5 font-sans">
                        <div className="flex items-center justify-between text-[10px] font-mono text-pm-muted">
                          <span className="font-semibold text-[#16141A] dark:text-white">Client Comment</span>
                          <span className="text-[9px] bg-[#FEF3E2] text-[#B06000] px-1.5 py-0.5 rounded font-bold">
                            Bug Flagged
                          </span>
                        </div>
                        <p className="text-xs text-[#16141A] dark:text-slate-200 leading-snug">
                          &ldquo;This card feels squished on tablets. Let&apos;s bump margin to 24px.&rdquo;
                        </p>
                        <div className="text-[10px] font-mono text-pm-muted">
                          Selector: <code className="text-[#2B4CFF]">section.pricing &gt; div.card</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: FIX DEMO */}
              {activeStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4 text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-[11px] font-mono font-semibold">
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Step 3 · Fix</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-snug">
                      Exact DOM selectors, screenshots, and one-click GitHub issues.
                    </h3>
                    <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                      Developers inspect comments with zero ambiguity. Click &ldquo;Mark as Fixed&rdquo; to notify the client, or export straight into your GitHub repository issue tracker.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] font-mono text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer shadow-xs"
                      >
                        <span>Start Over</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Step 3 Visual Card */}
                  <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-[#131217] border border-slate-200 dark:border-white/10 space-y-3 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-[#16141A] dark:text-white">
                          Developer Task Inspector
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            fixedState
                              ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                              : 'bg-[#FCE7E4] text-[#9E2A2B] border border-[#FCE7E4]'
                          }`}
                        >
                          {fixedState ? 'Status: Fixed' : 'Status: Open'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono space-y-1">
                        <div className="text-pm-muted">
                          Element: <span className="text-[#16141A] dark:text-white font-bold">button.cta-primary</span>
                        </div>
                        <div className="text-pm-muted">
                          Viewport: <span className="text-[#16141A] dark:text-white font-bold">390 x 844 (Mobile)</span>
                        </div>
                        <div className="text-pm-muted">
                          Browser: <span className="text-[#16141A] dark:text-white font-bold">Safari iOS 17.4</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setFixedState(!fixedState)}
                          className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            fixedState
                              ? 'bg-slate-200 dark:bg-white/10 text-pm-muted'
                              : 'bg-[#137333] hover:bg-[#0f5c29] text-white shadow-xs'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{fixedState ? 'Reopen Comment' : 'Mark as Fixed'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setGithubExported(true);
                            setTimeout(() => setGithubExported(false), 2500);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[#16141A] dark:text-white font-mono text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <GitPullRequest className="w-3.5 h-3.5 text-[#2B4CFF]" />
                          <span>{githubExported ? 'Issue #412 Created!' : 'Send to GitHub'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        </div>

      </div>
    </section>
  );
}
