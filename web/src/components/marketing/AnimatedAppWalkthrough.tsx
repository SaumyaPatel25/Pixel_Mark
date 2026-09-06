'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  MousePointer,
  Cpu,
  Radio,
  CheckCircle,
  CheckCircle2,
  Play,
  Pause,
  Terminal,
  Zap,
  Sparkles,
  Bell,
  Crosshair,
  Code2,
  CheckCheck,
  Layers,
  Eye,
  Activity,
  Check,
  ExternalLink,
  ShieldAlert,
  Clock,
  Send,
  ArrowUpRight,
} from 'lucide-react';
import { AnimatedMetricCounter } from '@/components/marketing/AnimatedMetricCounter';

interface StepMeta {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
}

const STEPS: StepMeta[] = [
  {
    id: 1,
    title: '1. Paste Any Link & Initialize',
    subtitle: 'Zero installs. Review any live site or staging URL in under a second.',
    badge: 'Quick Setup',
    icon: Globe,
  },
  {
    id: 2,
    title: '2. Point & Click Live Canvas',
    subtitle: 'Click any headline, image, button, or 3D canvas to drop an exact pin.',
    badge: 'Point & Click',
    icon: MousePointer,
  },
  {
    id: 3,
    title: '3. Auto Code & Evidence Capture',
    subtitle: 'STAGE grabs the exact CSS selector, screen size, and device info.',
    badge: 'Auto Code Info',
    icon: Cpu,
  },
  {
    id: 4,
    title: '4. Live Team Sync & Smart Digest',
    subtitle: 'See live reviewers. Rapid comments bundle into 1 tidy email summary.',
    badge: 'Smart Digest',
    icon: Radio,
  },
  {
    id: 5,
    title: '5. One-Click Fix & Status Sync',
    subtitle: 'Update status to Fixed. Pins resolve with exact sub-pixel coordinates.',
    badge: 'Done & Shipped',
    icon: CheckCircle,
  },
];

export default function AnimatedAppWalkthrough() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [typedText, setTypedText] = useState<string>('');
  const [typedStep1Url, setTypedStep1Url] = useState<string>('');
  const [step1State, setStep1State] = useState<'idle' | 'typing' | 'moving' | 'clicked'>('idle');

  // Step 2 Phase Management: Enter -> Hover headline -> Click Pin SA -> Drawer Reveal
  const [step2Phase, setStep2Phase] = useState<'enter' | 'hover' | 'click' | 'drawer'>('enter');

  // Step 3 Phase Management: Enter -> Hover mode -> Type issue title
  const [step3Phase, setStep3Phase] = useState<'mode' | 'scan' | 'type'>('mode');

  // Step 4 Phase Management: Presence -> Smooth inspect Pin Card 1 -> Outbox HUD
  const [step4Phase, setStep4Phase] = useState<'presence' | 'hover_pin' | 'outbox'>('presence');

  // Step 5 Phase Management: Status check -> Inspect coordinates -> Click Update button
  const [step5Phase, setStep5Phase] = useState<'dropdown' | 'coords' | 'resolve'>('dropdown');

  // Pacing: 4.2 seconds per step for natural, responsive, continuous auto-play
  const STEP_DURATION = 4200;
  const TICK_INTERVAL = 30;

  // Rock-solid deterministic wall-clock timer (Guarantees strictly 1 -> 2 -> 3 -> 4 -> 5 -> 1 with continuous auto-advance)
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    setProgress(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, (elapsed / STEP_DURATION) * 100);
      setProgress(currentProgress);

      if (elapsed >= STEP_DURATION) {
        clearInterval(interval);
        // Strictly advance to next step in exact order 1 -> 2 -> 3 -> 4 -> 5 -> 1
        setActiveStep((curr) => (curr >= STEPS.length ? 1 : curr + 1));
      }
    }, TICK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, activeStep]);

  // Step 1: Smooth cursor glide into input, realistic typing (https://www.designjoy.co), glide to button, click!
  useEffect(() => {
    if (activeStep !== 1) {
      setTypedStep1Url('');
      setStep1State('idle');
      return;
    }

    const targetUrl = 'https://www.designjoy.co';
    let charIdx = 0;
    let typingInterval: NodeJS.Timeout;

    // 0ms - 300ms: brief enter pause
    // 300ms: cursor moves to URL input and starts typing
    const t1 = setTimeout(() => {
      setStep1State('typing');
      typingInterval = setInterval(() => {
        if (charIdx <= targetUrl.length) {
          setTypedStep1Url(targetUrl.slice(0, charIdx));
          charIdx++;
        } else {
          clearInterval(typingInterval);
          // Finished typing: pause 300ms, then glide cursor smoothly to "Initialize Project" button
          setTimeout(() => {
            setStep1State('moving');
            // When cursor reaches button (700ms smooth glide), simulate click
            setTimeout(() => {
              setStep1State('clicked');
            }, 700);
          }, 300);
        }
      }, 50);
    }, 300);

    return () => {
      clearTimeout(t1);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [activeStep]);

  // Step 2 Orchestration: Enter -> Hover headline -> Click Pin SA -> Drawer Slide
  useEffect(() => {
    if (activeStep !== 2) {
      setStep2Phase('enter');
      return;
    }
    const t1 = setTimeout(() => setStep2Phase('hover'), 500);
    const t2 = setTimeout(() => setStep2Phase('click'), 1800);
    const t3 = setTimeout(() => setStep2Phase('drawer'), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeStep]);

  // Step 3 Orchestration: ELEM Mode -> Hover thumbnail -> Type Issue Title
  useEffect(() => {
    if (activeStep !== 3) {
      setStep3Phase('mode');
      setTypedText('');
      return;
    }
    const t1 = setTimeout(() => setStep3Phase('scan'), 600);
    const t2 = setTimeout(() => setStep3Phase('type'), 1400);

    let typingInterval: NodeJS.Timeout;
    const t3 = setTimeout(() => {
      const target = 'Headline typography wraps awkwardly on mobile viewports';
      let idx = 0;
      typingInterval = setInterval(() => {
        if (idx <= target.length) {
          setTypedText(target.slice(0, idx));
          idx++;
        } else {
          clearInterval(typingInterval);
        }
      }, 40);
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [activeStep]);

  // Step 4 Orchestration: Multi-Reviewer Presence -> Smoothly Inspect Pin Card 1 -> Outbox HUD
  useEffect(() => {
    if (activeStep !== 4) {
      setStep4Phase('presence');
      return;
    }
    const t1 = setTimeout(() => setStep4Phase('hover_pin'), 1200);
    const t2 = setTimeout(() => setStep4Phase('outbox'), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeStep]);

  // Step 5 Orchestration: Status Dropdown -> Coordinates Check -> Click Update & Linear Sync
  useEffect(() => {
    if (activeStep !== 5) {
      setStep5Phase('dropdown');
      return;
    }
    const t1 = setTimeout(() => setStep5Phase('coords'), 800);
    const t2 = setTimeout(() => setStep5Phase('resolve'), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeStep]);

  const selectStep = (stepId: number) => {
    setActiveStep(stepId);
    setProgress(0);
  };

  const getStepUrl = (step: number) => {
    switch (step) {
      case 1:
        return typedStep1Url
          ? `stage.io/projects/new?target=${typedStep1Url}`
          : 'stage.io/projects/new?target=https://...';
      case 2:
        return 'stage.io/review?url=designjoy.co&mode=comment';
      case 3:
        return 'stage.io/review?pin=9dd335ee-c360-4c57-b774';
      case 4:
        return 'stage.io/review/designjoy/observations?sync=live';
      case 5:
        return 'stage.io/review/designjoy/status-update?fixed=true';
      default:
        return 'stage.io/review';
    }
  };

  return (
    <section id="demo-walkthrough" className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Interactive 5-Step Demo
        </div>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3 sm:mb-4">
          How STAGE Works. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500">From Link to Fixed Code.</span>
        </h2>
        <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          See how simple website review should be. Clients click, developers get the code, and bugs get solved 3x faster.
        </p>
      </div>

      {/* Main Interactive Stage Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Step Navigation Menu */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 sm:gap-3">
          {STEPS.map((step) => {
            const isActive = activeStep === step.id;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => selectStep(step.id)}
                className={`relative text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 sm:gap-4 overflow-hidden group min-h-[44px] ${
                  isActive
                    ? 'bg-indigo-50/90 dark:bg-slate-900/90 border-indigo-500/60 shadow-md dark:shadow-xl dark:shadow-indigo-950/40'
                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-indigo-500/15 border-l-4 border-indigo-500"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: 'linear' }}
                  />
                )}

                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors z-10 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                <div className="flex-1 z-10 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {step.badge}
                    </span>
                    {isActive && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {step.subtitle}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="flex items-center justify-between pt-1 px-1">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors min-h-[44px]"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause Demo' : 'Auto Play'}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Step {activeStep} of 5</span>
          </div>
        </div>

        {/* Dynamic Simulator Window */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col min-h-[440px] sm:min-h-[520px]">
          <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex-1 max-w-sm sm:max-w-md mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">LIVE</span>
              <span className="truncate">{getStepUrl(activeStep)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>
          <div className="flex-1 p-3 sm:p-6 relative flex flex-col justify-center items-center overflow-hidden bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950">
            <AnimatePresence mode="wait">
              {/* STAGE 1: INGEST URL (step1-modal.png) with Live Typing & Button Click Animation */}
              {activeStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <div className="flex items-center justify-between w-full max-w-xl mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="duol-radar-ring absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Target Environment Ingestion
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded-full">
                      Ready in 0.3s
                    </span>
                  </div>

                  {/* Real Screenshot with Micro-Animations */}
                  <div className="relative w-full max-w-xl rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-[#0e1017]">
                    <img
                      src="/demo/step1-modal.png"
                      alt="STAGE Project Creation Modal"
                      width={750}
                      height={475}
                      fetchPriority="high"
                      decoding="async"
                      className="w-full h-auto object-contain block select-none pointer-events-none"
                    />

                    {/* Interactive Input Box Overlay: Types https://www.designjoy.co over target URL input */}
                    <div
                      className={`absolute top-[55.2%] left-[6.3%] w-[87.4%] h-[13.6%] rounded-xl bg-[#13151c] flex items-center px-3 sm:px-4 transition-all duration-200 pointer-events-none ${
                        step1State === 'typing'
                          ? 'border border-indigo-500/80 ring-1 ring-indigo-500/30'
                          : 'border border-slate-700/60'
                      }`}
                    >
                      <Globe
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-3 shrink-0 transition-colors ${
                          step1State === 'typing' ? 'text-indigo-400' : 'text-slate-400'
                        }`}
                      />
                      <div className="flex items-center text-xs sm:text-sm font-mono text-slate-100 font-medium tracking-wide truncate">
                        <span>{typedStep1Url}</span>
                        {step1State === 'typing' && (
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="inline-block w-1.5 h-4 bg-cyan-400 ml-0.5 shrink-0 shadow-[0_0_8px_#38bdf8]"
                          />
                        )}
                        {!typedStep1Url && step1State === 'idle' && (
                          <span className="text-slate-600 font-normal select-none">
                            https://www.example.com
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Button Subtle Click Press Effect */}
                    <motion.div
                      animate={{
                        scale: step1State === 'clicked' ? [1, 0.96, 1] : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className={`absolute top-[78.74%] left-[67.47%] w-[28.0%] h-[12.84%] rounded-xl pointer-events-none transition-all ${
                        step1State === 'clicked'
                          ? 'bg-blue-600/30 ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                          : 'bg-transparent'
                      }`}
                    />

                    {/* Simulated Cursor: Enters -> Types in URL input -> Glides to button -> Clicks */}
                    <motion.div
                      className="absolute z-30 pointer-events-none"
                      animate={{
                        top:
                          step1State === 'idle'
                            ? '35%'
                            : step1State === 'typing'
                            ? '60%'
                            : '85%',
                        left:
                          step1State === 'idle'
                            ? '25%'
                            : step1State === 'typing'
                            ? '48%'
                            : '81%',
                        scale: step1State === 'clicked' ? [1, 0.8, 1] : 1,
                        opacity: 1,
                      }}
                      transition={{
                        duration: step1State === 'moving' ? 0.7 : step1State === 'typing' ? 0.5 : 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div className="relative">
                        <MousePointer className="w-5 h-5 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] fill-white -rotate-12" />
                        <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-cyan-400/90 ring-2 ring-white/50 animate-pulse" />
                      </div>
                    </motion.div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Types the target URL and initializes the live proxy session in 0.3 seconds.</span>
                  </div>
                </motion.div>
              )}

              {/* STAGE 2: POINT & CLICK LIVE CANVAS (step2-canvas.png) */}
              {activeStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <div className="flex items-center justify-between w-full max-w-3xl mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="duol-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>Live Interactive Canvas</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-indigo-500 dark:text-indigo-400">designjoy.co</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        COMMENT MODE (C)
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1">
                        Substrate Synced
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-[#0b0c10]">
                    <img
                      src="/demo/step2-canvas.png"
                      alt="Live STAGE Review Canvas with Pin Annotation"
                      width={1024}
                      height={525}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-auto object-contain block select-none pointer-events-none"
                    />

                    {/* Delicate Pin Click Ripple - Clean, unobtrusive, zero obscuring */}
                    {step2Phase === 'click' && (
                      <div className="absolute top-[56%] left-[26.5%] w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0.9 }}
                          animate={{ scale: [1, 2.2], opacity: [0.9, 0] }}
                          transition={{ duration: 1.0, repeat: Infinity }}
                          className="absolute inset-0 rounded-full border-2 border-cyan-400"
                        />
                      </div>
                    )}

                    {/* Simulated Cursor: Enters -> Glides to Headline -> Clicks Pin SA -> Points to Drawer */}
                    <motion.div
                      animate={{
                        top:
                          step2Phase === 'enter'
                            ? '35%'
                            : step2Phase === 'hover'
                            ? '52%'
                            : step2Phase === 'click'
                            ? '56%'
                            : '45%',
                        left:
                          step2Phase === 'enter'
                            ? '18%'
                            : step2Phase === 'hover'
                            ? '38%'
                            : step2Phase === 'click'
                            ? '26.5%'
                            : '78%',
                        scale: step2Phase === 'click' ? [1, 0.75, 1] : 1,
                      }}
                      transition={{
                        duration:
                          step2Phase === 'hover'
                            ? 1.0
                            : step2Phase === 'click'
                            ? 0.9
                            : step2Phase === 'drawer'
                            ? 1.0
                            : 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="absolute z-30 pointer-events-none"
                    >
                      <div className="relative">
                        <MousePointer className="w-5 h-5 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] fill-white -rotate-12" />
                        <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-cyan-400/90 ring-2 ring-white/50 animate-pulse" />
                      </div>
                    </motion.div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MousePointer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Click any headline, image, button, or 3D canvas. STAGE locks the exact element and opens the feedback drawer.</span>
                  </div>
                </motion.div>
              )}

              {/* STAGE 3: AUTO CODE EVIDENCE & TELEMETRY (step3-feedback.png) */}
              {activeStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <div className="flex items-center justify-between w-full max-w-md mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="duol-radar-ring absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Auto Code Evidence & Telemetry Drawer
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      Mode: ELEM (E)
                    </span>
                  </div>

                  <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-[#0b0c10]">
                    <img
                      src="/demo/step3-feedback.png"
                      alt="STAGE Feedback Item Drawer"
                      width={583}
                      height={670}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-auto object-contain block select-none pointer-events-none"
                    />

                    {/* Simulated Cursor: Enters -> Glides to Issue Title -> Types description */}
                    <motion.div
                      animate={{
                        top:
                          step3Phase === 'mode'
                            ? '24%'
                            : step3Phase === 'scan'
                            ? '52%'
                            : '88%',
                        left:
                          step3Phase === 'mode'
                            ? '16%'
                            : step3Phase === 'scan'
                            ? '48%'
                            : '42%',
                        scale: step3Phase === 'type' ? [1, 0.8, 1] : 1,
                      }}
                      transition={{
                        duration:
                          step3Phase === 'scan'
                            ? 0.9
                            : step3Phase === 'type'
                            ? 0.8
                            : 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="absolute z-30 pointer-events-none"
                    >
                      <div className="relative">
                        <MousePointer className="w-5 h-5 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] fill-white -rotate-12" />
                        <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-cyan-400/90 ring-2 ring-white/50 animate-pulse" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Clean Telemetry Bar positioned BELOW screenshot, never overlaying on top */}
                  <div className="mt-3 w-full max-w-md p-2.5 sm:p-3 rounded-2xl bg-purple-50/90 dark:bg-slate-900/90 border border-purple-200 dark:border-purple-800/60 shadow-sm flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-slate-900 dark:text-white font-semibold truncate">h1.editorial-headline</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] shrink-0">
                      <span>390×844</span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0.01px Exact</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STAGE 4: REALTIME PRESENCE & OUTBOX FEED (step4-presence.png) */}
              {activeStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <div className="flex items-center justify-between w-full max-w-xl mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="duol-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Realtime Reviewer Presence & Outbox Feed
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                      <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                      Live Sync · 2 Online
                    </span>
                  </div>

                  <div className="relative w-full max-w-xl rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-[#0b0c10]">
                    <img
                      src="/demo/step4-presence.png"
                      alt="STAGE Observation Feed & Realtime Reviewers"
                      width={561}
                      height={318}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-auto object-contain block select-none pointer-events-none"
                    />

                    {/* Subtle Card 1 Focus Ring - Non-intrusive, zero text blocking */}
                    {step4Phase !== 'presence' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-[51%] left-[1.2%] right-[1.2%] h-[44%] rounded-2xl ring-1 ring-indigo-500/40 bg-indigo-500/[0.04] pointer-events-none"
                      />
                    )}

                    {/* Simulated Cursor: Smoothly glides down to Pin Card 1 */}
                    <motion.div
                      animate={{
                        top:
                          step4Phase === 'presence'
                            ? '25%'
                            : step4Phase === 'hover_pin'
                            ? '68%'
                            : '75%',
                        left:
                          step4Phase === 'presence'
                            ? '55%'
                            : step4Phase === 'hover_pin'
                            ? '35%'
                            : '60%',
                        scale: step4Phase === 'hover_pin' ? [1, 0.85, 1] : 1,
                      }}
                      transition={{
                        duration:
                          step4Phase === 'hover_pin'
                            ? 1.0
                            : step4Phase === 'outbox'
                            ? 0.9
                            : 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="absolute z-30 pointer-events-none"
                    >
                      <div className="relative">
                        <MousePointer className="w-5 h-5 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] fill-white -rotate-12" />
                        <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-cyan-400/90 ring-2 ring-white/50 animate-pulse" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Transactional Outbox Batching HUD Card positioned BELOW screenshot */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-3 w-full max-w-xl p-3 sm:p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-800/70 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
                          <span>STAGE Outbox Digest Active</span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-normal bg-indigo-500/10 px-1.5 py-0.5 rounded">15-min Window</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          2 pins batched into 1 clean summary email · Next dispatch in <strong>04:12</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0 font-semibold">
                      0 Inbox Spam
                    </span>
                  </motion.div>
                </motion.div>
              )}

              {/* STAGE 5: STATUS RESOLUTION & TELEMETRY SYNC (step5-resolve.png) */}
              {activeStep === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <div className="flex items-center justify-between w-full max-w-md mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="duol-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Status Resolution & Coordinate Telemetry
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Fixed ✓
                    </span>
                  </div>

                  <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-[#0b0c10]">
                    <img
                      src="/demo/step5-resolve.png"
                      alt="STAGE Feedback Pin Status Resolve"
                      width={568}
                      height={475}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-auto object-contain block select-none pointer-events-none"
                    />

                    {/* Subtle Button Click Feedback */}
                    <div className="absolute top-[54%] left-[2%] right-[2%] h-[16%] pointer-events-none flex items-center justify-center">
                      {step5Phase === 'resolve' && (
                        <motion.span
                          initial={{ scale: 0.9, opacity: 0.8 }}
                          animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                          transition={{ duration: 0.8 }}
                          className="absolute inset-0 rounded-2xl border-2 border-purple-400"
                        />
                      )}
                    </div>

                    {/* Simulated Cursor: Glides down to UPDATE FEEDBACK button and clicks */}
                    <motion.div
                      animate={{
                        top:
                          step5Phase === 'dropdown'
                            ? '25%'
                            : step5Phase === 'coords'
                            ? '42%'
                            : '62%',
                        left:
                          step5Phase === 'dropdown'
                            ? '50%'
                            : step5Phase === 'coords'
                            ? '55%'
                            : '50%',
                        scale: step5Phase === 'resolve' ? [1, 0.8, 1] : 1,
                      }}
                      transition={{
                        duration:
                          step5Phase === 'coords'
                            ? 0.8
                            : step5Phase === 'resolve'
                            ? 0.9
                            : 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="absolute z-30 pointer-events-none"
                    >
                      <div className="relative">
                        <MousePointer className="w-5 h-5 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] fill-white -rotate-12" />
                        <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-cyan-400/90 ring-2 ring-white/50 animate-pulse" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Resolution & SLA Celebration HUD positioned BELOW screenshot */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3 w-full max-w-md p-3 sm:p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 shadow-md flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-slate-900 dark:text-white font-bold">
                          Resolved in <strong className="text-emerald-600 dark:text-emerald-400"><AnimatedMetricCounter value={4} suffix=" minutes" /></strong>
                        </span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          SLA escalation daemon cancelled · 0 delay
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg shrink-0">
                      Synced to Linear
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
