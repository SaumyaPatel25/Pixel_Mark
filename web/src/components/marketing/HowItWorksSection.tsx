'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, MessageSquare, Check, ArrowRight, 
  ExternalLink, Copy, CheckCircle2, Lock, GitPullRequest, Code2
} from 'lucide-react';

interface HowItWorksStep {
  stepNumber: string;
  name: string;
  headline: string;
  description: string;
}

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [fixedState, setFixedState] = useState(false);
  const [githubExported, setGithubExported] = useState(false);

  // Section 8.4 Exact Text
  const steps: HowItWorksStep[] = [
    {
      stepNumber: '1',
      name: 'Share',
      headline: 'Create and send a review link.',
      description:
        'Paste your website address and create a review link. Send it to your client or team. The address cannot be changed later. To review another site, create a new project.',
    },
    {
      stepNumber: '2',
      name: 'Review',
      headline: 'Clients click directly on the live page.',
      description:
        'Reviewers open the link and click anywhere on the page to leave a comment. Nothing to install.',
    },
    {
      stepNumber: '3',
      name: 'Fix',
      headline: 'See exact elements and resolve fixes.',
      description:
        'Your team sees each comment on the exact element, with a screenshot. Mark it Fixed, or send it to GitHub as an issue.',
    },
  ];

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <section id="how-it-works" className="py-24 md:py-32 border-t border-pm-border/40 bg-pm-bg relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 space-y-16">
        
        {/* Section Header (Section 8.4) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pm-accent">
            How It Works
          </span>
          <h2 className="font-display text-4xl sm:text-6xl font-black text-pm-text tracking-tight">
            Share. Review. Fix.
          </h2>
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed font-sans max-w-xl mx-auto">
            Three simple steps between client feedback and verified developer fixes.
          </p>
        </div>

        {/* 3 Interactive Horizontal Steps Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((s, idx) => {
            const stepIndex = idx + 1;
            const isActive = activeStep === stepIndex;

            return (
              <button
                key={stepIndex}
                type="button"
                onClick={() => setActiveStep(stepIndex)}
                className={`p-6 rounded-3xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'bg-pm-surface border-pm-accent shadow-xl shadow-pm-accent/5 ring-2 ring-pm-accent/20'
                    : 'bg-pm-surface/50 border-pm-border hover:bg-pm-surface hover:border-pm-border-bright'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-pm-accent text-white'
                        : 'bg-pm-surface-2 text-pm-muted border border-pm-border'
                    }`}
                  >
                    {s.stepNumber}
                  </span>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted">
                    Step 0{stepIndex}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-bold text-pm-text">
                    {s.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── INTERACTIVE STEP DETAIL DEMONSTRATION ── */}
        <div className="rounded-3xl border border-pm-border bg-pm-surface p-6 sm:p-10 shadow-xl relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: SHARE DEMO */}
            {activeStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-6 space-y-4 text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pm-accent/10 text-pm-accent text-[11px] font-mono font-bold">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Step 1 · Share</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight">
                    Instant link generation with zero login walls for your client.
                  </h3>
                  <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                    Paste your live or staging URL. STAGE creates an encrypted review link that works across all modern browsers. You can optionally add a review password.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-pm-accent text-white font-mono text-xs font-bold flex items-center gap-2 hover:bg-pm-accent-bright transition-all cursor-pointer"
                    >
                      <span>Proceed to Step 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step 1 Visual Card */}
                <div className="lg:col-span-6 p-6 rounded-2xl bg-pm-surface-2 border border-pm-border space-y-4">
                  <div className="text-xs font-mono font-bold text-pm-text uppercase tracking-wider flex items-center justify-between">
                    <span>Generated Review Link</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                      Ready to share
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-pm-surface border border-pm-border">
                    <Lock className="w-4 h-4 text-pm-muted ml-2 flex-shrink-0" />
                    <span className="text-xs font-mono text-pm-text truncate flex-1 select-all">
                      https://stage.entrext.com/review/acme-staging-88fa
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-pm-accent hover:bg-pm-accent-bright text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
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

                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] font-mono text-amber-700 dark:text-amber-300">
                    💡 The website address cannot be changed after you create the project. To review a different site, create a new project.
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: REVIEW DEMO */}
            {activeStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-6 space-y-4 text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pm-accent/10 text-pm-accent text-[11px] font-mono font-bold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Step 2 · Review</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight">
                    Point, click, and explain. Your client installs nothing.
                  </h3>
                  <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                    Reviewers enter their name once and can immediately drop comments anywhere on the page. Every pin stays anchored to the exact CSS selector even when the window resizes.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="px-5 py-2.5 rounded-xl bg-pm-accent text-white font-mono text-xs font-bold flex items-center gap-2 hover:bg-pm-accent-bright transition-all cursor-pointer"
                    >
                      <span>Proceed to Step 3</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step 2 Visual Card */}
                <div className="lg:col-span-6 p-6 rounded-2xl bg-pm-surface-2 border border-pm-border relative overflow-hidden">
                  <div className="p-4 rounded-xl bg-pm-surface border border-pm-border space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-pm-border pb-2">
                      <span className="text-[10px] font-mono font-bold text-pm-muted">Target Site Preview</span>
                      <span className="text-[9px] font-mono bg-pm-accent/10 text-pm-accent px-2 py-0.5 rounded font-bold">
                        Comment Mode Active
                      </span>
                    </div>

                    <div className="p-4 rounded-lg bg-pm-surface-2 border border-dashed border-pm-accent/50 relative">
                      <div className="space-y-2">
                        <div className="w-24 h-2.5 rounded bg-pm-text/20" />
                        <div className="w-48 h-4 rounded bg-pm-text/80 font-bold" />
                      </div>

                      {/* Click Pin #1 */}
                      <div className="absolute top-2 right-4 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-pm-accent text-white flex items-center justify-center font-mono text-xs font-bold shadow-md ring-4 ring-pm-accent/25">
                          1
                        </div>
                      </div>
                    </div>

                    {/* Popover */}
                    <div className="p-3 rounded-xl bg-pm-surface border border-pm-border shadow-lg space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-pm-text">Pin #1 · Anika (Client)</span>
                        <span className="text-pm-muted">Just now</span>
                      </div>
                      <p className="text-xs text-pm-text font-sans">
                        &ldquo;This card padding should match the hero spacing.&rdquo;
                      </p>
                      <div className="text-[9px] font-mono text-pm-muted bg-pm-surface-2 p-1 rounded">
                        target: div.feature-card &gt; h3
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-6 space-y-4 text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pm-accent/10 text-pm-accent text-[11px] font-mono font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Step 3 · Fix</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight">
                    Every comment includes a screenshot and exact DOM selector.
                  </h3>
                  <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                    Developers see the exact element, screenshot, browser viewport, and device info. Mark comments Fixed when resolved, or export directly to a GitHub issue in one click.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="px-5 py-2.5 rounded-xl bg-pm-surface-2 border border-pm-border hover:bg-pm-surface text-pm-text font-mono text-xs font-bold transition-all cursor-pointer"
                    >
                      Start from Step 1
                    </button>
                  </div>
                </div>

                {/* Step 3 Visual Card */}
                <div className="lg:col-span-6 p-6 rounded-2xl bg-pm-surface-2 border border-pm-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-pm-text uppercase">Developer Review Inspector</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${fixedState ? 'bg-emerald-500/10 text-emerald-600' : 'bg-pm-accent/10 text-pm-accent'}`}>
                      Status: {fixedState ? 'Fixed' : 'Open'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-pm-surface border border-pm-border space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-pm-text">Issue Pin #1</span>
                      <span className="text-pm-muted">Desktop (1440x900)</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-pm-surface-2 border border-pm-border text-[11px] font-mono text-pm-muted flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                      <span className="truncate">main &gt; section#features &gt; div.card</span>
                    </div>

                    {/* Developer Resolution Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-pm-border">
                      <button
                        type="button"
                        onClick={() => setFixedState(!fixedState)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          fixedState
                            ? 'bg-pm-surface-2 border border-pm-border text-pm-text'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{fixedState ? 'Reopen' : 'Mark as Fixed'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGithubExported(true);
                          setTimeout(() => setGithubExported(false), 3000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-pm-surface-2 border border-pm-border hover:bg-pm-surface text-pm-text font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <GitPullRequest className="w-3.5 h-3.5 text-pm-accent" />
                        <span>{githubExported ? 'Sent to GitHub #42!' : 'Send to GitHub'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
    </section>
  );
}
