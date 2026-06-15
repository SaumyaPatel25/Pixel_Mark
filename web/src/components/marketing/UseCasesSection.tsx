'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Users, CheckCircle2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface UseCasesSectionProps {
  onHoverChange: (pos: { x: number; y: number } | null) => void;
}

// 1. Freelancer Animated Loop Component
const FreelancerVisual = () => {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step === 2) {
      const fullText = "Change CTA text to 'Launch Sandbox'";
      let cur = 0;
      const typeTimer = setInterval(() => {
        cur++;
        setTypedText(fullText.slice(0, cur));
        if (cur >= fullText.length) {
          clearInterval(typeTimer);
        }
      }, 40);
      return () => clearInterval(typeTimer);
    } else if (step === 0 || step === 1) {
      setTypedText('');
    }
  }, [step]);

  return (
    <div className="relative h-44 rounded-xl bg-black/40 border border-white/5 overflow-hidden p-3.5 font-mono text-[9px] text-pm-text select-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-white/60 font-bold uppercase tracking-wider">Freelancer Workspace</span>
        <span className="text-purple-400 font-bold text-[8px] animate-pulse">FAST SIGN-OFF</span>
      </div>

      {/* Center Simulated Webpage Mockup */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-1">
        {/* Mock Element to hover/pin */}
        <div className="relative px-6 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-md text-[9px] text-purple-300 font-sans">
          CTA BUTTON
          
          {/* Bounding Box on Hover/Pin */}
          {step >= 1 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -inset-1 border border-purple-500 rounded pointer-events-none shadow-[0_0_10px_rgba(147,51,234,0.35)]"
            />
          )}
        </div>

        {/* Pin dropping */}
        {step >= 1 && (
          <motion.div
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          >
            <div className="w-4 h-4 rounded-full border border-white bg-purple-500 flex items-center justify-center text-[7px] text-white font-bold shadow-lg">
              1
            </div>
          </motion.div>
        )}

        {/* Comment Drawer (slides up) */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-1 left-2 right-2 p-2 rounded bg-pm-surface border border-purple-500/20 shadow-xl space-y-1 z-20"
            >
              <div className="flex justify-between items-center text-[7px] text-pm-muted border-b border-white/5 pb-1">
                <span>COMMENT FROM CLIENT</span>
                <span className={step === 3 ? "text-emerald-400 font-bold" : "text-amber-400 animate-pulse"}>
                  {step === 3 ? "RESOLVED" : "DRAFT"}
                </span>
              </div>
              <div className="text-white text-[8px] h-4 leading-normal truncate">
                {typedText}
                {step === 2 && <span className="animate-pulse">|</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[7px] text-pm-muted">
        <span>STATUS: {step === 3 ? "READY FOR DEV" : "COLLECTING"}</span>
        <span className={step === 3 ? "text-emerald-400 font-bold" : "text-amber-400"}>
          {step === 3 ? "APPROVED" : "AWAITING RESOLUTION"}
        </span>
      </div>
    </div>
  );
};

// 2. Product & QA Animated Loop Component
const QAVisual = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-44 rounded-xl bg-black/40 border border-white/5 overflow-hidden p-3.5 font-mono text-[8.5px] text-pm-text select-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-white/60 font-bold uppercase tracking-wider">QA Inspector Lens</span>
        <span className="text-cyan-400 font-bold text-[8px] animate-pulse">DIAGNOSTICS</span>
      </div>

      {/* Center Grid containing webpage and sidebar */}
      <div className="flex-1 grid grid-cols-12 gap-2 my-1 items-center overflow-hidden">
        {/* Simulated Webpage (Col-Span 7) */}
        <div className="col-span-7 h-full border border-white/5 rounded bg-[#0b0b0f]/60 p-2 flex flex-col items-center justify-center relative">
          <div className="w-12 h-4 border border-cyan-500/20 rounded bg-cyan-500/5 relative flex items-center justify-center text-[7px] text-cyan-300">
            LOGO_DIV
            {step >= 0 && (
              <motion.div 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -inset-0.5 border border-cyan-400 rounded"
              />
            )}
          </div>
          {/* Target Reticle */}
          {step >= 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none flex items-center justify-center">
              <span className="absolute w-full h-[0.5px] bg-cyan-500/30" />
              <span className="absolute h-full w-[0.5px] bg-cyan-500/30" />
              <div className="w-1.5 h-1.5 rounded-full border border-cyan-500" />
            </div>
          )}
        </div>

        {/* Sidebar Diagnostics Panel (Col-Span 5) */}
        <div className="col-span-5 h-full border border-white/5 rounded bg-pm-surface p-1.5 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[7px] text-cyan-400 font-bold uppercase tracking-wider border-b border-white/5 block pb-0.5">METADATA</span>
            
            {step >= 1 && (
              <motion.div 
                initial={{ opacity: 0, x: 5 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-white font-bold font-sans text-[7.5px]"
              >
                DIV#header-logo
              </motion.div>
            )}

            {step >= 2 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-0.5 text-[6.5px] text-pm-muted leading-tight"
              >
                <div>Display: flex</div>
                <div>Width: 96px</div>
                <div className="truncate">XPath: /body/header/div</div>
              </motion.div>
            )}
          </div>

          {step >= 3 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [0.9, 1.05, 1], opacity: 1 }}
              className="p-0.5 rounded bg-red-950/20 border border-red-500/30 text-red-400 text-[6px] font-bold text-center animate-pulse"
            >
              CORS BLOCKED (403)
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[7px] text-pm-muted">
        <span>COLLECTED ASSETS: {step >= 2 ? "3/3 SUCCESS" : "PENDING"}</span>
        <span className="text-cyan-400 font-bold">LENS READY</span>
      </div>
    </div>
  );
};

// 3. Agencies Animated Loop Component
const AgencyVisual = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-44 rounded-xl bg-black/40 border border-white/5 overflow-hidden p-3.5 font-mono text-[8.5px] text-pm-text select-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-white/60 font-bold uppercase tracking-wider">Multi-Client Portal</span>
        <span className="text-pink-400 font-bold text-[8px] animate-pulse">COLLABORATIVE</span>
      </div>

      {/* Center collaborative workspace */}
      <div className="flex-1 relative my-1 overflow-hidden bg-[#0b0b0f]/60 border border-white/5 rounded p-2 flex flex-col justify-start gap-1">
        
        {/* WebSocket cursors overlay */}
        {step === 0 && (
          <>
            <motion.div 
              animate={{ x: [10, 80, 40], y: [10, 30, 20] }} 
              transition={{ duration: 3.5, ease: "easeInOut" }}
              className="absolute z-20 flex items-center gap-1 text-[6.5px] pointer-events-none"
            >
              <svg className="w-2.5 h-2.5 text-pink-500 fill-pink-500" viewBox="0 0 24 24"><path d="M4.5 3v15.25l3.96-3.96 2.37 5.71 2.37-.98-2.37-5.71h5.67L4.5 3z"/></svg>
              <span className="bg-pink-500 text-white px-1 rounded shadow">Sarah (Client)</span>
            </motion.div>
            <motion.div 
              animate={{ x: [100, 20, 75], y: [45, 15, 35] }} 
              transition={{ duration: 4, ease: "easeInOut" }}
              className="absolute z-20 flex items-center gap-1 text-[6.5px] pointer-events-none"
            >
              <svg className="w-2.5 h-2.5 text-blue-500 fill-blue-500" viewBox="0 0 24 24"><path d="M4.5 3v15.25l3.96-3.96 2.37 5.71 2.37-.98-2.37-5.71h5.67L4.5 3z"/></svg>
              <span className="bg-blue-500 text-white px-1 rounded shadow">Alex (Dev)</span>
            </motion.div>
          </>
        )}

        {/* Thread 1 (Always open) */}
        <div className="p-1 rounded bg-pm-surface/50 border border-white/5 flex justify-between items-center">
          <div className="space-y-0.5">
            <span className="text-[6px] text-pm-muted font-bold block">THREAD #12</span>
            <span className="text-white text-[7.5px]">"Logo alignment is off on Safari."</span>
          </div>
          <span className="text-[6px] px-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">OPEN</span>
        </div>

        {/* Thread 2 (Resolves in steps) */}
        {step >= 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-1 rounded border transition-colors duration-500 ${step === 3 ? "bg-emerald-950/10 border-emerald-500/20" : "bg-pm-surface/50 border-white/5"}`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <span className="text-[6px] text-pm-muted font-bold block">THREAD #13 • Sarah</span>
                <span className="text-white text-[7.5px]">"Increase hero heading font size."</span>
              </div>
              <span className={`text-[6px] px-1 rounded font-bold transition-all duration-300 ${step === 3 ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-pink-500/10 border border-pink-500/20 text-pink-400"}`}>
                {step === 3 ? "RESOLVED" : "PENDING"}
              </span>
            </div>

            {/* Replies nested */}
            {step >= 2 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 pt-1 border-t border-white/5 flex items-start gap-1 text-[7px] leading-tight"
              >
                <span className="text-blue-400 font-bold">Alex:</span>
                <span className="text-pm-muted">"Updated heading styles. Approved."</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[7px] text-pm-muted">
        <span>CLIENT PORTALS: 4 WORKSPACES ACT.</span>
        <span className="text-pink-400 font-bold">12 COLLABORATORS</span>
      </div>
    </div>
  );
};

export default function UseCasesSection({ onHoverChange }: UseCasesSectionProps) {
  const [hoveredCard, setHoveredCard] = useState<'freelancers' | 'qa' | 'agencies' | null>(null);
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && !!user;

  const handleCardMouseEnter = (card: 'freelancers' | 'qa' | 'agencies', e: React.MouseEvent<HTMLDivElement>) => {
    setHoveredCard(card);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
    const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
    onHoverChange({ x, y });
  };

  const handleCardMouseLeave = () => {
    setHoveredCard(null);
    onHoverChange(null);
  };

  const cardsData = [
    {
      id: 'freelancers' as const,
      icon: User,
      subtitle: 'For Freelancers & Web Developers',
      title: 'Get client approval in minutes, not weeks',
      description: 'Stop deciphering vague client emails and messages. Send them a secure link to pin feedback directly on elements, speeding up your revision loops.',
      bullets: [
        '0 client onboarding walls—they click and annotate',
        'Pins map to exact element selectors automatically',
        'Transition from draft requests to resolved state instantly'
      ],
      cta: 'Speed Up Client Sign-offs',
      visual: <FreelancerVisual />,
      glowColor: 'rgba(124, 58, 237, 0.15)',
      accentClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    },
    {
      id: 'qa' as const,
      icon: CheckCircle2,
      subtitle: 'For Product Managers & QA Teams',
      title: 'Zero-loss bug reports, straight to the dev',
      description: 'Streamline internal QA cycles. Non-technical testers and PMs drop pins to log bugs, and the engine packages computed CSS styles, console logs, and errors.',
      bullets: [
        'Auto-captures JavaScript errors & console exceptions',
        'Computes CSS properties (width, height, display, z-index)',
        'Export structured Markdown bugs directly to GitHub'
      ],
      cta: 'Scale Your QA Loop',
      visual: <QAVisual />,
      glowColor: 'rgba(6, 182, 212, 0.15)',
      accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      id: 'agencies' as const,
      icon: Briefcase,
      subtitle: 'For Creative & Development Agencies',
      title: 'Collaborative client reviews in one workspace',
      description: 'Present a polished, high-tech feedback portal to your clients. Group comments by target URL paths, resolve threads, and sync live cursor positions.',
      bullets: [
        'White-labeled dashboards matching client branding',
        'WebSocket live cursors track client reviews in real-time',
        'Resolve threads in place—clear open items sequentially'
      ],
      cta: 'Upgrade Client Hand-offs',
      visual: <AgencyVisual />,
      glowColor: 'rgba(236, 72, 153, 0.15)',
      accentClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20'
    }
  ];

  return (
    <section id="use-cases" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border/30">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
            Use Cases
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Tailored for your review workflow. <br />
            <span className="text-gradient-purple">A premium outcome-focused sandbox for every role.</span>
          </h2>
        </div>

        {/* Three Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {cardsData.map((card) => {
            const isHovered = hoveredCard === card.id;
            const isAnyHovered = hoveredCard !== null;
            const cardOpacity = !isAnyHovered ? 1 : isHovered ? 1 : 0.45;

            return (
              <motion.div
                key={card.id}
                onMouseEnter={(e) => handleCardMouseEnter(card.id, e)}
                onMouseLeave={handleCardMouseLeave}
                animate={{
                  opacity: cardOpacity,
                  scale: isHovered ? 1.015 : 0.99,
                  borderColor: isHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  '--glow-color': card.glowColor
                } as React.CSSProperties}
                className="relative flex flex-col justify-between p-6 rounded-2xl border border-white/5 bg-pm-surface/20 backdrop-blur-xl group hover:shadow-[0_0_30px_var(--glow-color)] transition-shadow duration-500 overflow-hidden min-h-[460px]"
              >
                {/* Accent background lighting spot inside active card */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 50% -10%, ${card.glowColor}, transparent 55%)`,
                    opacity: isHovered ? 1 : 0.3
                  }}
                />

                <div className="space-y-5 relative z-10">
                  {/* Icon + Subtitle */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.accentClass}`}>
                      <card.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-pm-muted">
                      {card.subtitle}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2 text-left">
                    <h3 className="font-display text-base font-bold text-white group-hover:text-white transition-colors leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs text-pm-muted leading-relaxed font-sans min-h-[48px]">
                      {card.description}
                    </p>
                  </div>

                  {/* Visual Live Demonstration */}
                  <div className="w-full">
                    {card.visual}
                  </div>

                  {/* Bullets List */}
                  <div className="space-y-2.5 pt-1">
                    {card.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-left">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pm-cyan flex-shrink-0 mt-0.5" />
                        <span className="text-[10px] text-pm-text leading-tight font-sans">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call To Action */}
                <div className="pt-6 relative z-10">
                  <Link
                    href={isUserLoggedIn ? "/dashboard" : "/register"}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border hover:border-pm-accent/40 rounded-lg text-[10px] font-bold uppercase tracking-widest text-pm-text hover:text-white transition-all cursor-pointer"
                  >
                    <span>{isUserLoggedIn ? "Open Dashboard" : card.cta}</span>
                    <ArrowUpRight className="w-3 h-3 text-pm-accent-vivid" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
