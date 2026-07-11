'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Share2, MousePointerClick, Camera, Code, Lock, Sparkles } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Share2,
    badge: 'SETUP',
    label: 'Import',
    title: 'Import your website instantly',
    description:
      'Enter your live website URL or preview link. Our secure proxy spins up a sandboxed review session in seconds—no dev config or NPM packages required.',
    accent: 'rgba(99,130,255,1)',
    accentGlow: 'rgba(99,130,255,0.18)',
    accentSubtle: 'rgba(99,130,255,0.07)',
  },
  {
    number: '02',
    icon: MousePointerClick,
    badge: 'FEEDBACK',
    label: 'Annotate',
    title: 'Point, click, and drop comment pins',
    description:
      'Click directly on any element, button, text, or Three.js canvas. Drop precise annotation pins exactly where the issue is, and attach metadata in one click.',
    accent: 'rgba(52,211,153,1)',
    accentGlow: 'rgba(52,211,153,0.18)',
    accentSubtle: 'rgba(52,211,153,0.07)',
  },
  {
    number: '03',
    icon: Camera,
    badge: 'COLLABORATION',
    label: 'Share',
    title: 'Share secure client review links',
    description:
      'Send stakeholders or clients a secure review link. They can drop feedback on the live page without installing extensions or creating accounts.',
    accent: 'rgba(251,146,60,1)',
    accentGlow: 'rgba(251,146,60,0.18)',
    accentSubtle: 'rgba(251,146,60,0.07)',
  },
  {
    number: '04',
    icon: Code,
    badge: 'SHIP',
    label: 'Export',
    title: 'Export CSS patches and sync with GitHub',
    description:
      'Every pin carries absolute CSS selectors, XPath routes, and layout state. Export generated CSS overrides and push sign-off commits directly.',
    accent: 'rgba(232,121,249,1)',
    accentGlow: 'rgba(232,121,249,0.18)',
    accentSubtle: 'rgba(232,121,249,0.07)',
  },
];

/* ─── Step Visualisers ──────────────────────────────────────────────────── */
function Step1Visual({ accent }: { accent: string }) {
  return (
    <div className="w-full max-w-[320px] space-y-3">
      <div className="mkt-how-inner-card rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
            style={{ background: `${accent}14`, color: accent }}
          >
            Target Proxy
          </span>
          <Lock className="w-3 h-3 opacity-30" style={{ color: accent }} />
        </div>
        <div className="mkt-how-nested-card rounded-xl border flex items-center gap-2 px-3 py-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
          <span className="font-mono text-[10px] opacity-70">https://yourproject.vercel.app</span>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8 }}
            style={{ background: accent }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#4ade80' }}
          />
          <span className="font-mono text-[9px] opacity-40">Sandboxed session ready</span>
        </div>
      </div>
    </div>
  );
}

function Step2Visual({ accent }: { accent: string }) {
  return (
    <div className="w-full max-w-[340px]">
      <div className="mkt-how-inner-card rounded-2xl border p-4 space-y-3 relative overflow-hidden">
        {/* Fake webpage skeleton */}
        <div className="space-y-2">
          <div className="h-2.5 rounded-full w-3/4 opacity-20" style={{ background: accent }} />
          <div className="h-1.5 rounded-full w-full opacity-10 bg-slate-400 dark:bg-white" />
          <div className="h-1.5 rounded-full w-5/6 opacity-10 bg-slate-400 dark:bg-white" />
        </div>
        <div className="mkt-how-nested-card rounded-xl p-3 space-y-2 border">
          <div className="flex gap-2 items-start">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: `${accent}20`, color: accent }}
            >
              PM
            </span>
            <div>
              <p className="text-[10px] font-bold opacity-80">Hero Section — h1</p>
              <p className="font-mono text-[8px] opacity-40">div.hero › h1.title</p>
            </div>
          </div>
        </div>
        {/* Animated pin */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[38%] left-[35%] flex flex-col items-center"
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-mono font-bold border-2 shadow-lg"
            style={{
              background: accent,
              borderColor: 'rgba(255,255,255,0.25)',
              color: '#000',
              boxShadow: `0 0 12px ${accent}60`,
            }}
          >
            2
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function Step3Visual({ accent }: { accent: string }) {
  const members = [
    { name: 'Sarah — Product', status: 'ONLINE', online: true },
    { name: 'Michael — Client', status: 'VIEWING', online: true },
    { name: 'Jamil — Dev', status: 'IDLE', online: false },
  ];
  return (
    <div className="w-full max-w-[300px]">
      <div className="mkt-how-inner-card rounded-2xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ background: accent }}
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>
            Collaborative Session
          </span>
        </div>
        <div className="space-y-1.5">
          {members.map((m) => (
            <div
              key={m.name}
              className="mkt-how-nested-card flex items-center justify-between px-3 py-2 rounded-xl border"
            >
              <span className="text-[10px] font-medium opacity-70">{m.name}</span>
              <span
                className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: m.online ? `${accent}18` : 'rgba(255,255,255,0.05)',
                  color: m.online ? accent : 'rgba(255,255,255,0.3)',
                }}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step4Visual({ accent }: { accent: string }) {
  return (
    <div className="w-full max-w-[340px]">
      <div className="mkt-how-inner-card rounded-2xl border p-4 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>
            Generated CSS Patch
          </span>
          <span className="text-[8px] opacity-30">Ready to merge</span>
        </div>
        <div
          className="rounded-xl p-3 space-y-0.5 text-[9px] leading-relaxed border"
          style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div style={{ color: accent }}>{'/* PixelMark Override */'}</div>
          <div><span className="text-pink-400">h1</span><span className="opacity-60">.hero-title</span> <span className="opacity-40">{'{'}</span></div>
          <div className="pl-3"><span className="text-blue-300">font-size</span><span className="opacity-40">:</span> <span className="text-amber-300">3.5rem</span><span className="opacity-40">;</span></div>
          <div className="pl-3"><span className="text-blue-300">margin-bottom</span><span className="opacity-40">:</span> <span className="text-amber-300">2rem</span><span className="opacity-40">;</span></div>
          <div className="opacity-40">{'}'}</div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 opacity-40" style={{ color: accent }} />
          <span className="text-[8px] opacity-30">3 changes ready · 1 conflict resolved</span>
        </div>
      </div>
    </div>
  );
}

const visuals = [Step1Visual, Step2Visual, Step3Visual, Step4Visual];

/* ─── Section ───────────────────────────────────────────────────────────── */
export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: '-20% 0px' });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  /* Auto-advance steps */
  useEffect(() => {
    if (isHovering) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setActiveStep((p) => (p + 1) % steps.length), 5500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isHovering]);

  const step = steps[activeStep];
  const Visual = visuals[activeStep];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-32 overflow-hidden border-t border-pm-border/30"
      style={{ background: 'transparent' }}
    >
      {/* Background glow atmosphere (only visible when dark mode is enabled) */}
      <div className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-700">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${step.accentGlow} 0%, transparent 80%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mb-16 space-y-4 text-left"
        >
          <h2 className="mkt-section-h2 font-display text-4xl md:text-5xl lg:text-[4rem] font-extrabold tracking-[-0.035em] text-[#1D264F] leading-[1.01]">
            No extension walls.
          </h2>
          <div className="space-y-1.5">
            <p className="mkt-how-subtitle text-sm md:text-base font-semibold text-[#253B80] leading-relaxed">
              A visual QA pipeline designed by product designers, for product developers.
            </p>
            <p className="mkt-how-desc text-xs md:text-sm text-pm-muted leading-relaxed">
              Discover how PixelMark accelerates visual reviews.
            </p>
          </div>
        </motion.div>

        {/* Two-Column Grid: Visual display on LEFT, Steps on RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT COLUMN: Visual mockups */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mkt-how-outer-frame relative rounded-[32px] overflow-hidden">
              {/* Chrome bar */}
              <div className="mkt-how-chrome-bar flex items-center justify-between px-5 py-3.5 border-b">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeStep}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="font-mono text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: step.accent }}
                    >
                      STEP {step.number} VISUALIZER
                    </motion.span>
                  </AnimatePresence>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: step.accent }}
                  />
                </div>
                {/* Step indicators */}
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className="transition-all duration-300 rounded-full"
                      style={{
                        width: activeStep === i ? 20 : 6,
                        height: 6,
                        background: activeStep === i ? step.accent : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(37, 59, 128, 0.15)'),
                      }}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div
                className="relative flex items-center justify-center p-10 min-h-[360px] bg-slate-50/50 dark:bg-transparent"
                style={{
                  background: isDark
                    ? `radial-gradient(ellipse 70% 60% at 50% 50%, ${step.accentGlow} 0%, transparent 70%)`
                    : 'rgba(37, 59, 128, 0.015)',
                }}
              >
                {/* Corner accents */}
                <span className="absolute top-4 left-4 w-5 h-5 border-t border-l rounded-tl-md opacity-20" style={{ borderColor: step.accent }} />
                <span className="absolute top-4 right-4 w-5 h-5 border-t border-r rounded-tr-md opacity-20" style={{ borderColor: step.accent }} />
                <span className="absolute bottom-4 left-4 w-5 h-5 border-b border-l rounded-bl-md opacity-20" style={{ borderColor: step.accent }} />
                <span className="absolute bottom-4 right-4 w-5 h-5 border-b border-r rounded-br-md opacity-20" style={{ borderColor: step.accent }} />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, scale: 0.93, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -8 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex justify-center w-full"
                  >
                    <Visual accent={step.accent} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Caption/Control bar */}
              <div className="mkt-how-caption-bar px-6 py-4 border-t flex items-center justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="mkt-how-caption-title font-display font-semibold text-sm tracking-[-0.01em]">
                      {step.title}
                    </p>
                    <p className="mkt-how-caption-sub font-mono text-[9px] uppercase tracking-wider mt-0.5">
                      {step.label} · {step.badge}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Chevron navigator */}
                <div className="flex gap-2 relative z-25">
                  <button
                    onClick={() => setActiveStep((p) => (p - 1 + steps.length) % steps.length)}
                    className="mkt-how-nav-btn w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    aria-label="Previous step"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveStep((p) => (p + 1) % steps.length)}
                    className="mkt-how-nav-btn w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    aria-label="Next step"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Accent reflection beneath card */}
            {isDark && (
              <div
                className="absolute -bottom-8 left-[10%] right-[10%] h-16 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ background: step.accent }}
              />
            )}
          </motion.div>

          {/* RIGHT COLUMN: Steps stack */}
          <div
            className="lg:col-span-5 space-y-3"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {steps.map((s, i) => {
              const isActive = activeStep === i;
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 16 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={() => setActiveStep(i)}
                  onClick={() => setActiveStep(i)}
                  data-active={isActive}
                  data-index={i}
                  className="mkt-how-step-card relative rounded-2xl cursor-pointer group overflow-hidden transition-all duration-400 border border-transparent"
                  style={{
                    padding: isActive ? '20px 24px' : '16px 24px',
                  }}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeBar"
                      className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                      style={{ background: s.accent }}
                    />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon Container */}
                    <div className="mkt-how-icon-wrapper w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300">
                      <Icon className="w-5 h-5" style={{ width: 18, height: 18 }} />
                    </div>

                    {/* Text block */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="mkt-how-step-badge font-mono text-[9px] font-bold uppercase tracking-[0.15em] transition-colors duration-300 text-slate-400">
                          {s.badge}
                        </span>
                        <span className="mkt-how-step-num font-mono text-[10px] font-bold tabular-nums text-slate-300">
                          {s.number}
                        </span>
                      </div>
                      <h3 className="mkt-how-step-title font-display font-bold leading-tight transition-colors duration-300 text-[0.9375rem] text-[#1D264F]">
                        {s.title}
                      </h3>
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.p
                            key="desc"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mkt-how-step-desc overflow-hidden text-[0.8125rem] leading-relaxed text-pm-muted font-normal"
                          >
                            {s.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Tiny active progress bar */}
                  {isActive && !isHovering && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-[2px] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5.5, ease: 'linear' }}
                      style={{ background: `linear-gradient(90deg, ${s.accent}60, ${s.accent})` }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
