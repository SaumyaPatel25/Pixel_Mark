'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, ArrowLeft, Shield, User, Play, Sparkles, 
  HelpCircle, BookOpen, Layers, Zap, MessageSquare, Share2, Info 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function GettingStartedPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'developer' | 'reviewer'>('developer');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  const { startOnboarding, hydrateFromLocalStorage } = useOnboardingStore();

  useEffect(() => {
    hydrateFromLocalStorage();
  }, [hydrateFromLocalStorage]);

  const handleLaunchTour = (role: 'developer' | 'reviewer') => {
    startOnboarding(role);
    if (role === 'developer') {
      router.push('/dashboard');
    } else {
      // Reviewer tour starts on public review links; redirect to dashboard to open or create one
      router.push('/dashboard');
    }
  };

  const faqs = [
    {
      q: 'Why is my target website not loading in the review frame?',
      a: 'Some websites send "X-Frame-Options: DENY" or "Content-Security-Policy: frame-ancestors" headers, which block them from being loaded inside an iframe. STAGE uses a secure diagnostic proxy to bypass these, but if it fails, make sure your dev server is active and accessible.'
    },
    {
      q: 'Do my clients/reviewers need to sign up for STAGE?',
      a: 'No! Reviewers do not need an account or password to leave feedback. When you generate a secure review link, they can click it, enter their display name (for marker identification), and immediately start pinning feedback.'
    },
    {
      q: 'How does live synchronization work?',
      a: 'STAGE uses real-time WebSockets. When a developer or reviewer places a pin or replies to a comment, it instantly syncs across all open browsers. You don\'t need to refresh the page to see new observations.'
    },
    {
      q: 'What is the diagnostic support panel?',
      a: 'The diagnostics panel tracks performance metrics, console warnings, and failed asset downloads (images, scripts, CSS) on the page you are auditing, helping developers solve rendering bugs easily.'
    }
  ];

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text transition-colors duration-300 font-sans pb-16">
      {/* Top slim navigation header */}
      <header className="h-16 border-b border-pm-border bg-pm-surface flex items-center justify-between px-6 md:px-12 sticky top-0 z-30 transition-all shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-pm-border bg-pm-surface text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-pm-border" />
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-pm-accent" />
            <h1 className="text-sm font-extrabold tracking-tight uppercase text-pm-text">Getting Started</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-12 md:pt-16 text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pm-accent-subtle border border-pm-border text-[10px] font-black text-pm-accent uppercase tracking-widest"
        >
          <Sparkles className="w-3.5 h-3.5" />
          STAGE Guided Center
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-black tracking-tight text-pm-text uppercase max-w-2xl mx-auto"
        >
          Visual QA Made <span className="text-pm-accent">Simple</span>
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-pm-muted max-w-lg mx-auto leading-relaxed font-semibold"
        >
          Review layouts, capture console diagnostics, and invite clients to drop feedback pins right on the live website. Let\'s get you up to speed in 5 minutes.
        </motion.p>
      </div>

      {/* Segment switcher */}
      <div className="max-w-5xl mx-auto px-6 mt-12">
        <div className="flex justify-center mb-8">
          <div className="p-1 rounded-2xl border border-pm-border bg-pm-surface-2 flex">
            <button
              onClick={() => setActiveTab('developer')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'developer' 
                  ? 'bg-pm-surface text-pm-text shadow-md border border-pm-border' 
                  : 'text-pm-muted hover:text-pm-text'
              }`}
            >
              <Shield className="w-4 h-4 text-pm-accent" />
              For Developers & Admins
            </button>
            <button
              onClick={() => setActiveTab('reviewer')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'reviewer' 
                  ? 'bg-pm-surface text-pm-text shadow-md border border-pm-border' 
                  : 'text-pm-muted hover:text-pm-text'
              }`}
            >
              <User className="w-4 h-4 text-emerald-500" />
              For Reviewers & Clients
            </button>
          </div>
        </div>

        {/* Dynamic content cards */}
        <AnimatePresence mode="wait">
          {activeTab === 'developer' ? (
            <motion.div
              key="developer-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
            >
              {/* Dev Roadmap Guide */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-black uppercase text-pm-text flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-pm-accent" />
                    Developer Quickstart Workflow
                  </h3>
                  
                  <div className="space-y-6">
                    {[
                      { step: '01', title: 'Create a Project & Add URL', desc: 'Initialize a project and define the target URL you want to audit (e.g. staging or dev environment).' },
                      { step: '02', title: 'Launch Audit Canvas', desc: 'Enter the review session. STAGE secures your site inside our canvas, injecting visual QA hooks.' },
                      { step: '03', title: 'Pin Issues and Bugs', desc: 'Click any visual element to report layout bugs, edit copies, or log rendering errors automatically.' },
                      { step: '04', title: 'Generate Review Links', desc: 'Copy a secure share link to invite reviewers or clients to view observations or drop their own comments.' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-pm-accent-subtle border border-pm-border text-pm-accent">
                          {step.step}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold tracking-tight text-pm-text">{step.title}</h4>
                          <p className="text-xs text-pm-muted leading-relaxed font-semibold">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Developer FAQs */}
                <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-black uppercase text-pm-text flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-pm-accent" />
                    Developer FAQ
                  </h3>
                  <div className="divide-y divide-pm-border">
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="py-4 first:pt-0 last:pb-0">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                          className="w-full flex justify-between items-center text-left text-xs font-bold tracking-tight text-pm-text hover:text-pm-accent transition-colors py-1 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <span className="text-lg font-mono">{expandedFaq === idx ? '-' : '+'}</span>
                        </button>
                        <AnimatePresence>
                          {expandedFaq === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-pm-muted leading-relaxed font-semibold pt-2.5">
                                {faq.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dev CTA Right Panel */}
              <div className="space-y-6">
                <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 text-center space-y-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pm-accent/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-pm-accent-subtle border border-pm-border flex items-center justify-center mx-auto text-pm-accent">
                    <Zap className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-md font-extrabold tracking-tight text-pm-text">Interactive Sandbox Tour</h4>
                    <p className="text-xs text-pm-muted font-semibold leading-relaxed">
                      Launch the guided in-app tour to experience visual QA features step-by-step directly on the dashboard.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleLaunchTour('developer')}
                    className="w-full h-12 bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Dev Tour
                  </Button>
                </div>

                <div className="bg-pm-surface-2 border border-pm-border rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-pm-accent">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Developer API</span>
                  </div>
                  <p className="text-xs text-pm-muted font-semibold leading-relaxed">
                    Automate capturing observations and injecting test sessions into your CI/CD pipeline using our secure Node/Python SDK wrappers.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/docs/api')}
                    className="w-full h-10 border-pm-border bg-pm-surface hover:bg-pm-surface-2 text-pm-text text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Read API Docs
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Reviewer Tab */
            <motion.div
              key="reviewer-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
            >
              {/* Reviewer Road Map */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-black uppercase text-pm-text flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-500" />
                    Reviewer Guide: How to Leave Feedback
                  </h3>
                  
                  <div className="space-y-6">
                    {[
                      { step: '01', title: 'Open the Review Link', desc: 'Click the secure STAGE review link shared by your developer. No registration is required.' },
                      { step: '02', title: 'Enter Your Display Name', desc: 'Choose a name so developers can identify who left each comment. Pick a signature marker color.' },
                      { step: '03', title: 'Double Click to Pin Feedback', desc: 'See something that needs fixing? Click "Leave Feedback", then click directly on the canvas to place a pin.' },
                      { step: '04', title: 'Review & Confirm Comments', desc: 'Submit observations. You can edit your comments, attach screenshots, or review tags left by others in real-time.' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          {step.step}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold tracking-tight text-pm-text">{step.title}</h4>
                          <p className="text-xs text-pm-muted leading-relaxed font-semibold">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviewer Quick Tips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-extrabold tracking-tight text-pm-text uppercase">Thread Replies</h4>
                    <p className="text-xs text-pm-muted leading-relaxed font-semibold">
                      Reviewers can reply to threads directly under any pin, making collaboration and alignment conversations context-bound.
                    </p>
                  </div>
                  <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-extrabold tracking-tight text-pm-text uppercase">No Sign Up Needed</h4>
                    <p className="text-xs text-pm-muted leading-relaxed font-semibold">
                      Never block client feedback with registration screens. They just join, type a display name, and start collaborating.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reviewer CTA Panel */}
              <div className="space-y-6">
                <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 text-center space-y-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                    <User className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-md font-extrabold tracking-tight text-pm-text">Reviewer Guided Path</h4>
                    <p className="text-xs text-pm-muted font-semibold leading-relaxed">
                      Ready to start? Open your developer dashboard and invite reviewers to collaborate on active sessions.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleLaunchTour('reviewer')}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Open Dashboard
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
