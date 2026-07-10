'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, MousePointerClick, Camera, Code, Play, CheckCircle2, Lock, Sparkles, UserCheck } from 'lucide-react';

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const autoPlayTimer = useRef<any>(null);

  const steps = [
    {
      number: '01',
      icon: Share2,
      badge: 'SETUP',
      title: 'Import your website instantly',
      description: 'Enter your live website URL or preview link. Our secure proxy spins up a sandboxed review session in seconds—no dev config or NPM packages required.',
      color: 'bg-[#FCE2E1]/20 text-[#253B80]',
      borderColor: 'group-hover:border-[#FCE2E1]'
    },
    {
      number: '02',
      icon: MousePointerClick,
      badge: 'FEEDBACK',
      title: 'Point, click, and drop comment pins',
      description: 'Click directly on any element, button, text, or Three.js canvas. Drop precise annotation pins exactly where the issue is, and attach metadata in one click.',
      color: 'bg-[#E2F3F5] text-[#253B80]',
      borderColor: 'group-hover:border-[#E2F3F5]'
    },
    {
      number: '03',
      icon: Camera,
      badge: 'COLLABORATION',
      title: 'Share secure client review links',
      description: 'Send stakeholders or clients a secure review link. They can drop feedback on the live page without installing extensions or creating accounts.',
      color: 'bg-[#C7B4D6]/20 text-[#253B80]',
      borderColor: 'group-hover:border-[#C7B4D6]'
    },
    {
      number: '04',
      icon: Code,
      badge: 'FIXES',
      title: 'Export CSS and sync with GitHub',
      description: 'Track feedback pinned with absolute CSS selectors, xpath routes, and layout state. Export generated CSS overrides directly to sign off changes.',
      color: 'bg-[#E2F3F5]/80 text-[#253B80]',
      borderColor: 'group-hover:border-[#E2F3F5]/60'
    }
  ];

  // Auto-play steps when user isn't hovering
  useEffect(() => {
    if (isHovering) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isHovering]);

  return (
    <section id="how-it-works" className="relative py-36 bg-transparent overflow-hidden border-t border-pm-border/30">
      {/* Dynamic ambient color wash depending on active step */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#FCE2E1]/10 via-[#C7B4D6]/10 to-[#E2F3F5]/10 rounded-full blur-[140px] pointer-events-none z-0 transition-all duration-1000" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-24 space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80] bg-[#253B80]/5 px-3 py-1 rounded-full">
            HOW IT WORKS
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-[4rem] font-extrabold tracking-[-0.03em] text-[#1D264F] leading-[1.02]">
            From staging URL to client sign-off. <br />
            No extension walls.
          </h2>
          <p className="text-sm md:text-base text-pm-muted leading-relaxed max-w-xl font-sans pt-2">
            A visual QA pipeline designed by product designers, for product developers. Discover how PixelMark accelerates visual reviews.
          </p>
        </div>

        {/* Side-by-Side Presentation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Visual Mockup (Sticky) */}
          <div className="lg:col-span-6 lg:sticky lg:top-28 flex flex-col justify-center select-none z-10">
            <div className="w-full aspect-[4/3] rounded-[32px] border border-pm-border bg-white/70 backdrop-blur-md p-4 md:p-6 shadow-[0_32px_60px_-16px_rgba(41,54,129,0.06)] relative overflow-hidden flex flex-col justify-between group">
              
              <div className="absolute top-4 right-6 font-mono text-[9px] text-pm-text-faint/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>STEP {steps[activeStep].number} VISUALIZER</span>
              </div>

              {/* Dynamic Slides */}
              <div className="flex-1 flex items-center justify-center pt-8">
                <AnimatePresence mode="wait">
                  {activeStep === 0 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="w-full max-w-sm space-y-4 text-left"
                    >
                      <div className="bg-[#FCE2E1]/10 border border-[#FCE2E1]/50 p-4.5 rounded-2xl space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-[#253B80] uppercase tracking-wider bg-[#FCE2E1]/30 px-2 py-0.5 rounded">
                            Target Proxy
                          </span>
                          <Lock className="w-3.5 h-3.5 text-pm-text-faint" />
                        </div>
                        <div className="bg-white border border-pm-border/60 p-2 rounded-xl flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#253B80]" />
                          <span className="font-mono text-[10px] text-pm-text select-all">https://yourproject.com</span>
                        </div>
                        <div className="h-1 bg-pm-border/30 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2.2, ease: 'easeInOut' }}
                            className="h-full bg-[#253B80]" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeStep === 1 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="w-full max-w-md relative"
                    >
                      {/* Simulated page section with dropped pin */}
                      <div className="bg-white border border-pm-border p-5 rounded-2xl space-y-4 shadow-sm text-left relative overflow-hidden">
                        <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">PM</div>
                          <div className="space-y-1">
                            <h4 className="text-[12px] font-bold text-pm-text leading-none">Hero Section Title</h4>
                            <p className="text-[10px] text-pm-muted leading-tight">Adjust grid align property</p>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-pm-text-faint">
                            <span>SELECTOR:</span>
                            <span className="text-[#253B80] font-semibold">div.hero &gt; h1</span>
                          </div>
                        </div>
                        
                        {/* Pinned overlay */}
                        <motion.div 
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute top-[40%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#253B80] text-white flex items-center justify-center text-[9px] font-mono font-bold border-2 border-white shadow-md">
                            2
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {activeStep === 2 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="w-full max-w-sm text-left"
                    >
                      <div className="bg-[#C7B4D6]/10 border border-[#C7B4D6]/40 p-5 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#253B80]" />
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#253B80] font-mono">
                            Collaborative Session
                          </h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-pm-border">
                            <span className="text-[11px] font-medium text-pm-text">Sarah (Product Manager)</span>
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-bold">ONLINE</span>
                          </div>
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-pm-border">
                            <span className="text-[11px] font-medium text-pm-text">Michael (Client Reviewer)</span>
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-[#E2F3F5] text-[#253B80] rounded-full font-bold">ONLINE</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeStep === 3 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="w-full max-w-md text-left"
                    >
                      <div className="bg-white border border-pm-border rounded-2xl shadow-sm p-4.5 space-y-3 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#253B80] font-bold uppercase tracking-wider">
                            Generated CSS Patch
                          </span>
                          <span className="text-[9px] text-pm-text-faint">Ready to merge</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-emerald-400 overflow-x-auto space-y-0.5 leading-relaxed select-all">
                          <div><span className="text-[#C7B4D6]">/* PixelMark Auto-Override */</span></div>
                          <div><span className="text-pink-400">h1</span><span className="text-white">.hero-title</span> &#123;</div>
                          <div className="pl-4"><span className="text-blue-300">font-size</span>: <span className="text-amber-400">3.5rem</span>;</div>
                          <div className="pl-4"><span className="text-blue-300">margin-bottom</span>: <span className="text-amber-400">2rem</span>;</div>
                          <div>&#125;</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Indicators */}
              <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-pm-border/30">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeStep === index ? 'w-8 bg-[#253B80]' : 'w-2 bg-pm-border/80'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Hover Cards */}
          <div 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="lg:col-span-6 space-y-5"
          >
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setActiveStep(index)}
                  className={`p-6 rounded-2xl border transition-all duration-400 cursor-pointer text-left relative overflow-hidden group ${
                    isActive 
                      ? 'border-[#253B80]/15 bg-white shadow-[0_16px_40px_-16px_rgba(37,59,128,0.06)]' 
                      : 'border-transparent bg-transparent hover:bg-white/40 hover:border-pm-border/80'
                  }`}
                >
                  <div className="flex gap-5 items-start">
                    {/* Icon container */}
                    <div className={`w-10 h-10 rounded-xl ${step.color} border border-pm-border/40 flex items-center justify-center flex-shrink-0 transition-transform duration-500 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                      <step.icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-pm-text-faint group-hover:text-[#253B80] transition-colors">
                          {step.badge}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-pm-text-faint/80">
                          {step.number}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#1D264F] leading-tight font-display group-hover:text-[#253B80] transition-colors">
                        {step.title}
                      </h3>

                      <p className={`text-[11px] text-pm-muted leading-relaxed font-sans transition-all duration-300 ${isActive ? 'opacity-100 max-h-40 pt-1' : 'opacity-60 group-hover:opacity-90'}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
