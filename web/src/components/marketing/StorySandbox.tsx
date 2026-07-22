'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Info, Share2, Clipboard, 
  Globe, CheckCircle2, User, Users, Briefcase, Check, 
  Terminal, Settings, Layout, MessageSquare, Sparkles, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Step {
  id: number;
  title: string;
  badge: string;
  role: string;
  benefit: string;
  desc: string;
  addressBar: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Visual Staging Canvas',
    badge: '1. WEBSITE INIT',
    role: 'Developers & Creators',
    benefit: 'Works on any preview link or port—no setup required.',
    desc: 'The developer spins up their website. The staging URL is entered into STAGE, launching a proxy canvas that maps the page state exactly.',
    addressBar: 'https://nova-analytics.vercel.app'
  },
  {
    id: 2,
    title: 'Drop Context Pin',
    badge: '2. DEVELOPER MARK',
    role: 'Freelancers & Designers',
    benefit: 'Drop pins directly on elements—never describe coordinates in text again.',
    desc: 'The creator identifies a layout issue or design review request. They point, click, and drop Pin #1 directly on the element, writing a brief draft comment.',
    addressBar: 'https://nova-analytics.vercel.app'
  },
  {
    id: 3,
    title: 'Secure Sharing',
    badge: '3. SHARE REVIEW LINK',
    role: 'Agencies & Studios',
    benefit: 'Replace long feedback email chains with a single live link.',
    desc: 'STAGE generates a secure collaboration link. Copy the URL to send to stakeholders, clients, or design communities for structured review.',
    addressBar: 'https://stage.io/review/collab-nova'
  },
  {
    id: 4,
    title: 'Client Entry',
    badge: '4. REVIEWER PORTAL',
    role: 'Clients & Stakeholders',
    benefit: 'Clients drop feedback instantly—no login or extension required.',
    desc: 'The client opens the shared review link in their standard browser. They see the live page and existing markers, ready to collaborate.',
    addressBar: 'https://stage.io/review/collab-nova'
  },
  {
    id: 5,
    title: 'Client Collaboration',
    badge: '5. CLIENT PINNING',
    role: 'Product Teams & Reviewers',
    benefit: 'Frictionless pinning ensures all feedback is contextual.',
    desc: 'The client clicks the page subheading to drop Pin #2: "The subheading font weight looks too light here." The feedback is logged directly on the live viewport elements.',
    addressBar: 'https://stage.io/review/collab-nova'
  },
  {
    id: 6,
    title: 'Automated Metadata Logs',
    badge: '6. CONTEXT EXTRACTION',
    role: 'QA Leads & Developers',
    benefit: 'Never ask "what screen size?" again. Layout context logs automatically.',
    desc: 'STAGE automatically logs the target XPath selector, exact CSS properties (font-size, margins), and console warnings associated with the clicked element.',
    addressBar: 'https://stage.io/review/collab-nova'
  },
  {
    id: 7,
    title: 'Rapid Resolution',
    badge: '7. FEEDBACK RESOLVED',
    role: 'All Review Roles',
    benefit: 'Align immediately, fix layout specs, and close work 3x faster.',
    desc: 'The developer views the feedback trails, exports stylesheet patches, and marks the pins as resolved. A clean checkmark stamps the thread and updates the page styling.',
    addressBar: 'https://stage.io/review/collab-nova'
  },
  {
    id: 8,
    title: 'Outcome & Metrics',
    badge: '8. PROJECT COMPLETE',
    role: 'High-Converting outcome',
    benefit: 'Tasteful results instead of fake marketing hype.',
    desc: 'A structured review saves client revisions and speeds up approvals. Revisions dropped by 60%—from 3 rounds down to 1 clean loop.',
    addressBar: 'https://stage.io/review/collab-nova'
  }
];

const ChartMini = () => (
  <div className="w-full p-2.5 bg-pm-surface-3/10 dark:bg-pm-surface-3/5 border border-pm-border rounded-xl mt-1">
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-pm-accent animate-pulse" />
        <span className="text-[7px] font-mono font-bold text-pm-text/50">Live Analytics</span>
      </div>
      <span className="text-[7.5px] font-mono text-emerald-500 font-bold">+18.4%</span>
    </div>
    <svg className="w-full h-10 overflow-visible" viewBox="0 0 100 25">
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pm-accent)" stopOpacity={0.25} />
          <stop offset="100%" stopColor="var(--pm-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area */}
      <path 
        d="M0,25 L0,15 Q15,8 30,12 T60,5 T90,2 T100,0 L100,25 Z" 
        fill="url(#chart-grad)"
      />
      {/* Line */}
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        d="M0,15 Q15,8 30,12 T60,5 T90,2 T100,0"
        fill="none"
        stroke="var(--pm-accent)"
        strokeWidth="1"
      />
    </svg>
  </div>
);

export default function StorySandbox() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [typedClientComment, setTypedClientComment] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [devClick, setDevClick] = useState(false);
  const [clientClick, setClientClick] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-playing logic: moves slowly and deliberately (5.5s per step)
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length) {
            setIsPlaying(false);
            return 1;
          }
          return prev + 1;
        });
      }, 6200);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  // Click ripple resetter
  useEffect(() => {
    setDevClick(false);
    setClientClick(false);
    
    if (currentStep === 2) {
      const clickTimer = setTimeout(() => {
        setDevClick(true);
      }, 1000);
      return () => clearTimeout(clickTimer);
    }
    
    if (currentStep === 5) {
      const clickTimer = setTimeout(() => {
        setClientClick(true);
      }, 1000);
      return () => clearTimeout(clickTimer);
    }
  }, [currentStep]);

  // Toast triggers
  useEffect(() => {
    setShowToast(null);
    
    if (currentStep === 4) {
      const timer = setTimeout(() => {
        setShowToast("Sarah Chen (Client) joined the review session");
      }, 800);
      return () => clearTimeout(timer);
    }
    
    if (currentStep === 7) {
      const timer = setTimeout(() => {
        setShowToast("PR #412 created on GitHub - font weight fixed");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Typing simulator for client comments on Step 5
  useEffect(() => {
    if (currentStep === 5) {
      const txt = 'The subheading font weight looks too light here.';
      setTypedClientComment('');
      
      const delayTimer = setTimeout(() => {
        let index = 0;
        const typingTimer = setInterval(() => {
          index++;
          setTypedClientComment(txt.slice(0, index));
          if (index >= txt.length) clearInterval(typingTimer);
        }, 40);
        return () => clearInterval(typingTimer);
      }, 1400); // Wait for cursor to land and click
      
      return () => clearTimeout(delayTimer);
    } else {
      setTypedClientComment('');
    }
  }, [currentStep]);

  const nextStep = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const copyLink = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const stepDetails = steps[currentStep - 1];

  // Derive cursor paths
  const devCursorX = currentStep === 2 ? "52%" : "10%";
  const devCursorY = currentStep === 2 ? "52%" : "90%";
  const devCursorVisible = currentStep === 2;

  const clientCursorX = currentStep === 4 ? "82%" : currentStep === 5 ? "50%" : "95%";
  const clientCursorY = currentStep === 4 ? "20%" : currentStep === 5 ? "32%" : "15%";
  const clientCursorVisible = currentStep === 4 || currentStep === 5;

  return (
    <div className="w-full max-w-6xl mx-auto rounded-[32px] border border-pm-border/30 bg-pm-surface/40 backdrop-blur-md p-6 shadow-xl relative z-10 flex flex-col gap-8 transition-colors duration-500">
      
      {/* Sandbox Header Control Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-pm-border/20 pb-4">
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-pm-accent/10 flex items-center justify-center text-pm-accent">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-pm-text">Know STAGE better</h3>
            <p className="text-[10px] text-pm-text/60">Follow the end-to-end review journey and watch how it works in real-time.</p>
          </div>
        </div>

        {/* Play & Stepper Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${isPlaying ? 'bg-pm-accent text-white border-pm-accent shadow-sm' : 'bg-pm-surface-2 text-pm-text border-pm-border hover:bg-pm-surface-3'}`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-white stroke-white" />
                <span>Auto-Playing</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-pm-text stroke-pm-text" />
                <span>Auto Play</span>
              </>
            )}
          </button>
          
          <div className="flex items-center border border-pm-border rounded-full p-0.5 bg-pm-surface-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="p-2 rounded-full hover:bg-pm-surface transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-pm-text" />
            </button>
            <span className="px-3 font-mono text-[10px] font-bold text-pm-text">
              {currentStep} / {steps.length}
            </span>
            <button
              onClick={nextStep}
              disabled={currentStep === steps.length}
              className="p-2 rounded-full hover:bg-pm-surface transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowRight className="w-3.5 h-3.5 text-pm-text" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Dynamic Webpage Canvas (Cols 7) */}
        <div className="lg:col-span-7 flex flex-col bg-pm-surface-2 rounded-2xl border border-pm-border/30 overflow-hidden shadow-inner min-h-[400px] transition-colors relative">
          
          {/* Simulated Browser Bar */}
          <div className="h-10 bg-pm-surface border-b border-pm-border/30 flex items-center px-4 justify-between transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
            </div>
            
            <div className="px-4 py-1.5 bg-pm-bg/80 border border-pm-border/40 rounded-lg text-[9px] font-mono text-pm-text/60 w-3/5 text-center truncate shadow-sm transition-colors">
              {stepDetails.addressBar}
            </div>

            <div className="w-16 flex justify-end items-center gap-2">
              {/* Online avatar status group */}
              {currentStep >= 4 && (
                <div className="flex -space-x-1.5 mr-1.5 animate-fade-in">
                  <div className="w-4.5 h-4.5 rounded-full bg-blue-500 border border-pm-surface text-[6px] text-white flex items-center justify-center font-bold">A</div>
                  <div className="w-4.5 h-4.5 rounded-full bg-pink-500 border border-pm-surface text-[6px] text-white flex items-center justify-center font-bold relative">
                    S
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-pm-surface animate-pulse" />
                  </div>
                </div>
              )}
              <Globe className="w-4 h-4 text-pm-text/40" />
            </div>
          </div>

          {/* Website Canvas Area */}
          <div className="flex-1 p-6 flex items-center justify-center relative bg-pm-bg/20 overflow-hidden min-h-[340px]">
            {/* Grid Pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            {/* Injected proxy script scan line for Step 1 */}
            {currentStep === 1 && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-pm-accent/10 to-transparent pointer-events-none z-10"
              />
            )}

            {/* Custom Toast Notifications inside the viewport */}
            <AnimatePresence>
              {showToast && (
                <motion.div
                  initial={{ y: -40, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -40, opacity: 0, scale: 0.95 }}
                  className="absolute top-4 inset-x-4 bg-pm-accent text-white px-3.5 py-2 rounded-xl text-[8.5px] font-mono font-bold shadow-lg z-40 flex items-center gap-2 justify-center max-w-xs mx-auto border border-white/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{showToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Core Interactive Canvas Wrapper */}
            <div className="relative w-full max-w-sm">
              
              {/* Mockup Landing Page Canvas */}
              <div className="w-full rounded-2xl border border-pm-border bg-pm-surface p-5 shadow-lg text-left relative overflow-hidden h-[310px] flex flex-col justify-between transition-colors duration-500">
                
                {/* Visual Proxy Banner for Step 1 */}
                {currentStep === 1 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[6.5px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-fade-in">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                    <span>PROXY SCRIPTS INJECTED</span>
                  </div>
                )}

                <div>
                  {/* Top Dashboard Nav */}
                  <div className="flex items-center justify-between w-full border-b border-pm-border/30 pb-2 mb-3">
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-pm-accent to-pm-cyan flex items-center justify-center text-[7px] text-white font-black">N</div>
                      <span className="font-display font-black text-[9.5px] text-pm-text">Nova</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[8px] text-pm-text/60">
                      <span>Pricing</span>
                      <span>Docs</span>
                    </div>
                    <div className="w-12 h-5 rounded bg-pm-text/5 flex items-center justify-center text-[7px] text-pm-text/50 font-bold">Sign In</div>
                  </div>

                  {/* Hero Copy */}
                  <div className="space-y-2 mt-2">
                    <h4 className="font-display font-black text-center text-[13px] text-pm-text leading-tight tracking-tight uppercase">
                      Scale your analytics
                    </h4>
                    
                    {/* Subheading element (relative target for Pin #2) */}
                    <div className="relative p-1 rounded transition-all duration-300">
                      {currentStep === 5 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 border border-dashed border-rose-500/40 rounded animate-pulse" 
                        />
                      )}
                      
                      <p className={`text-center text-[8.5px] px-3 leading-relaxed text-pm-text/60 transition-all duration-500 max-w-[240px] mx-auto ${currentStep >= 7 ? 'font-bold text-pm-text' : 'font-light'}`}>
                        Connect all your data sources and get instant real-time query results.
                      </p>
                      
                      {/* Pin #2 (Client Pin) */}
                      {currentStep >= 5 && currentStep <= 7 && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full border border-white flex items-center justify-center text-[7.5px] text-white font-black shadow-lg z-20 ${currentStep === 7 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        >
                          {currentStep === 7 ? '✓' : '2'}
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons (relative target for Pin #1) */}
                  <div className="flex justify-center mt-3">
                    <div className="relative px-4 py-1.5 rounded text-[8px] font-bold text-white transition-all duration-300 bg-pm-accent hover:bg-pm-accent-bright flex items-center justify-center select-none">
                      {currentStep === 2 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute -inset-1 border border-dashed border-pm-accent rounded animate-pulse" 
                        />
                      )}
                      <span>Get Started</span>
                      
                      {/* Pin #1 (Developer Pin) */}
                      {currentStep >= 2 && currentStep <= 7 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[6px] text-white font-bold shadow-md z-20 ${currentStep === 7 ? 'bg-emerald-500' : 'bg-pm-accent'}`}
                        >
                          {currentStep === 7 ? '✓' : '1'}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Visual / Outcome section */}
                {currentStep < 8 ? (
                  <ChartMini />
                ) : (
                  /* Step 8 outcome details */
                  <div className="w-full border-t border-pm-border/30 pt-3 mt-1 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[7.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>VERIFIED APPROVED</span>
                      </div>
                      
                      {/* Signature signature using loaded Caveat font */}
                      <span className="text-[11px] text-pm-text/60 italic px-2 font-mono flex items-center gap-1 select-none" style={{ fontFamily: 'Caveat, cursive' }}>
                        Sarah Chen
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-[8px] font-mono">
                      <div className="p-1 bg-pm-accent/5 rounded border border-pm-border">
                        <div className="font-bold text-pm-accent">1 Loop</div>
                        <div className="text-[6px] opacity-60">Revisions</div>
                      </div>
                      <div className="p-1 bg-pm-accent/5 rounded border border-pm-border">
                        <div className="font-bold text-pm-accent">-60%</div>
                        <div className="text-[6px] opacity-60">Approval Time</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cursor pointers absolute inside the wrapper */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: devCursorVisible ? 1 : 0,
                  left: devCursorX,
                  top: devCursorY,
                  scale: devClick ? [1, 0.9, 1] : 1
                }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 75, 
                  damping: 14,
                  scale: { duration: 0.2 } 
                }}
                className="absolute pointer-events-none z-50 flex flex-col gap-1 items-start shadow-xl"
                style={{ position: 'absolute', transform: 'translate(-2px, -2px)' }}
              >
                <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" viewBox="0 0 24 24" fill="none">
                  <path d="M4.5 3V17L9.5 12.5H16.5L4.5 3Z" fill="#3B82F6" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <div className="px-1.5 py-0.5 rounded bg-blue-500 text-[6.5px] font-mono font-bold text-white shadow-md whitespace-nowrap">
                  Alex (Dev)
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: clientCursorVisible ? 1 : 0,
                  left: clientCursorX,
                  top: clientCursorY,
                  scale: clientClick ? [1, 0.9, 1] : 1
                }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 75, 
                  damping: 14,
                  scale: { duration: 0.2 } 
                }}
                className="absolute pointer-events-none z-50 flex flex-col gap-1 items-start shadow-xl"
                style={{ position: 'absolute', transform: 'translate(-2px, -2px)' }}
              >
                <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" viewBox="0 0 24 24" fill="none">
                  <path d="M4.5 3V17L9.5 12.5H16.5L4.5 3Z" fill="#EC4899" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <div className="px-1.5 py-0.5 rounded bg-pink-500 text-[6.5px] font-mono font-bold text-white shadow-md whitespace-nowrap">
                  Sarah (Client)
                </div>
              </motion.div>

              {/* Click Ripple Effects */}
              {devClick && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 1 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute w-8 h-8 rounded-full border-2 border-blue-400 pointer-events-none z-40"
                  style={{ left: '52%', top: '52%', transform: 'translate(-50%, -50%)' }}
                />
              )}

              {clientClick && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 1 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute w-8 h-8 rounded-full border-2 border-pink-400 pointer-events-none z-40"
                  style={{ left: '50%', top: '32%', transform: 'translate(-50%, -50%)' }}
                />
              )}

              {/* Comment Tooltips Popups */}
              <AnimatePresence>
                {/* Step 2: Dev Comment Card */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 15 }}
                    transition={{ delay: 1.2 }}
                    className="absolute top-[62%] left-[5%] right-[5%] p-2.5 bg-pm-surface border border-pm-accent/25 rounded-xl shadow-lg z-30 flex gap-2 items-start"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-[#3B82F6] text-[8px] font-bold flex-shrink-0 mt-0.5">A</div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center text-[7.5px] font-bold text-pm-text">
                        <span>Alex Dev</span>
                        <span className="opacity-40">Just now</span>
                      </div>
                      <p className="text-[8px] text-pm-text/70 leading-relaxed font-sans">"Should this action button be aligned further right?"</p>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Client comment typing popup */}
                {currentStep === 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 15 }}
                    transition={{ delay: 1.2 }}
                    className="absolute top-[42%] left-[5%] right-[5%] p-2.5 bg-pm-surface border border-pink-500/25 rounded-xl shadow-lg z-30 flex gap-2 items-start"
                  >
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 text-[8px] font-bold flex-shrink-0 mt-0.5">S</div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center text-[7.5px] font-bold text-pm-text">
                        <span>Sarah Chen (Client)</span>
                        {typedClientComment.length < 42 ? (
                          <span className="text-[6.5px] text-amber-500 animate-pulse font-mono">typing...</span>
                        ) : (
                          <span className="opacity-40">Draft</span>
                        )}
                      </div>
                      <p className="text-[8.5px] text-pm-text min-h-[22px] leading-relaxed font-sans">
                        {typedClientComment}
                        {typedClientComment.length < 42 && <span className="animate-ping">|</span>}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3: Secure Sharing Overlay */}
              <AnimatePresence>
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(2px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="absolute inset-0 bg-pm-surface/65 z-20 flex flex-col items-center justify-center p-6 text-center space-y-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"
                    >
                      <Share2 className="w-5 h-5" />
                    </motion.div>
                    
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-xs text-pm-text">Shareable Link Ready</h4>
                      <p className="text-[8.5px] text-pm-text/60 leading-normal max-w-[200px] mx-auto">Stakeholders open it directly in their standard browser—no extension required.</p>
                    </div>
                    
                    <div className="flex items-center gap-2 p-1 rounded-xl border border-pm-border bg-pm-surface-2 text-[9px] w-full max-w-[280px]">
                      <span className="font-mono text-pm-text/60 truncate flex-1 pl-2 text-left">stage.io/review/collab-nova</span>
                      <button
                        onClick={copyLink}
                        className="px-2.5 py-1 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-lg font-mono text-[8px] font-bold uppercase cursor-pointer transition-all flex items-center gap-1 select-none"
                      >
                        {isCopied ? <Check className="w-2.5 h-2.5" /> : <Clipboard className="w-2.5 h-2.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 6: Console Logs inspector Panel */}
              <AnimatePresence>
                {currentStep === 6 && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                    className="absolute bottom-0 inset-x-0 bg-pm-surface border-t border-pm-border/60 backdrop-blur-md p-3.5 z-30 flex flex-col font-mono text-[8px] h-[155px] text-left"
                  >
                    {/* DevTools Tab Bar */}
                    <div className="flex items-center justify-between border-b border-pm-border/30 pb-1.5 mb-2 select-none">
                      <div className="flex gap-2">
                        <span className="font-bold text-pm-accent border-b border-pm-accent pb-0.5">STAGE SPECS</span>
                        <span className="opacity-45">CONSOLE (0)</span>
                      </div>
                      <span className="text-[7.5px] bg-pink-500/10 text-pink-500 px-1.5 py-0.5 rounded font-black">PIN #2 METADATA</span>
                    </div>

                    {/* Metadata specs sheet */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 py-0.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="opacity-45 text-[7px] uppercase font-bold">XPath Selector</span>
                        <span className="text-violet-500 font-bold truncate">/main/div/p.hero-subtext</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="opacity-45 text-[7px] uppercase font-bold">Element Styles</span>
                        <span className="text-rose-500 font-bold">font-weight: 300 (Light)</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="opacity-45 text-[7px] uppercase font-bold">Client Viewport</span>
                        <span className="text-sky-500 font-bold">1440x900px (Desktop)</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="opacity-45 text-[7px] uppercase font-bold">Browser / OS</span>
                        <span className="font-bold truncate">Chrome 124 / macOS</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-pm-border/30 pt-2 mt-2 flex justify-between items-center text-[7px]">
                      <span className="opacity-50">Collected dynamically on live DOM nodes</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Ready for Fix
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Side: Narrative Explanation Panel (Cols 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl border border-pm-border/30 bg-pm-surface/85 backdrop-blur-md shadow-sm relative text-left min-h-[380px]">
          
          {/* Top details */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold tracking-widest text-pm-accent-bright dark:text-pm-accent-vivid bg-pm-accent/5 border border-pm-border px-2.5 py-1 rounded select-none">
                {stepDetails.badge}
              </span>
              <span className="font-mono text-[9px] opacity-40 select-none">
                Story Beat {currentStep} of {steps.length}
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-xl sm:text-2xl font-black text-pm-text uppercase leading-none tracking-tight">
                {stepDetails.title}
              </h3>
              
              <div className="flex flex-col gap-1.5 pt-1 border-t border-pm-border/20">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-pm-text/70 select-none">
                  <User className="w-3.5 h-3.5 text-pm-accent" />
                  <span>Beneficiary: <strong className="text-pm-text font-black">{stepDetails.role}</strong></span>
                </div>
                <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold leading-normal">
                  {stepDetails.benefit}
                </div>
              </div>

              <p className="text-[12.5px] leading-relaxed text-pm-text/75 pt-1.5 transition-colors font-sans">
                {stepDetails.desc}
              </p>
            </div>
          </div>

          {/* Stepper progress indicator */}
          <div className="space-y-4 pt-6">
            <div className="flex gap-1.5 w-full select-none">
              {steps.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { setIsPlaying(false); setCurrentStep(s.id); }}
                  className={`h-1 flex-1 rounded-full cursor-pointer transition-all duration-300 ${s.id <= currentStep ? 'bg-pm-accent scale-y-[1.2]' : 'bg-pm-border/40 hover:bg-pm-border/60'}`}
                />
              ))}
            </div>

            {/* Step redirect or CTA at end */}
            <div className="pt-2">
              {currentStep === steps.length ? (
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Start Your First Review</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={nextStep}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border hover:border-pm-accent text-pm-text rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <span>Proceed to Next Beat</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Target Roles summary strip inside Sandbox */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-pm-border/20 text-left">
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-lg bg-pm-accent/5 flex items-center justify-center text-pm-accent-bright dark:text-pm-accent-vivid flex-shrink-0 mt-0.5">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-bold text-[10.5px] uppercase tracking-wider text-pm-text">Agencies & Studios</h4>
            <p className="text-[9.5px] text-pm-text/60 leading-normal">White-label review links matching high-value client workflows.</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-lg bg-pm-accent/5 flex items-center justify-center text-pm-accent-bright dark:text-pm-accent-vivid flex-shrink-0 mt-0.5">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-bold text-[10.5px] uppercase tracking-wider text-pm-text">Freelance Creators</h4>
            <p className="text-[9.5px] text-pm-text/60 leading-normal">Post links to Discord or social channels to get design critiques instantly.</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-lg bg-pm-accent/5 flex items-center justify-center text-pm-accent-bright dark:text-pm-accent-vivid flex-shrink-0 mt-0.5">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-bold text-[10.5px] uppercase tracking-wider text-pm-text">Product Review Teams</h4>
            <p className="text-[9.5px] text-pm-text/60 leading-normal">Structured annotations carrying raw layout logs straight to developers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
