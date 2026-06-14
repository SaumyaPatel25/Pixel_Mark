'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Eye, FileCode, CheckCircle2, Zap, MousePointer2 } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  // Demo states for looping animation
  const [demoStep, setDemoStep] = useState(0); // 0: Idle/Cursor moving, 1: Pin 1 dropped + drawer opening, 2: Pin 2 dropped + drawer update
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Loop steps:
    // 0s: Reset, cursor moves to Hero Button
    // 2s: Click button -> Drop Pin 1 -> Open Drawer
    // 6s: Close Drawer -> Cursor moves to Header Link
    // 8.5s: Click header link -> Drop Pin 2 -> Open Drawer with new info
    // 12.5s: Close Drawer -> Reset to step 0
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Cursor coordinates based on demo step
  const cursorCoords = [
    { x: '60%', y: '65%' },  // Step 0: Moving to CTA Button
    { x: '60%', y: '65%' },  // Step 1: Clicked CTA Button
    { x: '25%', y: '25%' },  // Step 2: Moving to Heading
    { x: '25%', y: '25%' },  // Step 3: Clicked Heading
  ];

  // Fade up entry variants
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: i * 0.1,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    })
  };

  return (
    <section className="relative min-h-[92vh] pt-[72px] pb-16 flex items-center justify-center overflow-hidden bg-pm-bg dot-grid">
      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.12),transparent_65%)]" />
        <div className="absolute top-0 right-0 w-[45%] h-[45%] bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.08),transparent_55%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column (Content) */}
        <div className="lg:col-span-5 flex flex-col justify-center text-left space-y-6">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-pm-accent-subtle border border-pm-border-bright text-pm-accent-vivid text-[10px] font-bold uppercase tracking-widest"
          >
            <Zap className="w-3.5 h-3.5 fill-pm-accent-vivid/20" />
            <span>⚡ Precision Visual Feedback, Reimagined</span>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]"
          >
            Resilient feedback. <br />
            <span className="text-gradient-purple font-black">Direct on the DOM.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-sm md:text-base text-pm-muted leading-relaxed max-w-lg"
          >
            Drop precision pins on any live element. PixelMark captures screenshots, selectors, Computed CSS, and console errors automatically. No account or extension required for clients and reviewers.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex flex-wrap gap-4 pt-2"
          >
            <Link
              href="/auth/register"
              className="px-6 py-3 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-accent hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
            >
              Start Free Redesign
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3 bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-text border border-pm-border rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              How It Works
            </a>
          </motion.div>

          {/* Quick Metrics */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="grid grid-cols-3 gap-6 pt-6 border-t border-pm-border max-w-md"
          >
            <div>
              <div className="font-display text-lg font-bold text-white">0</div>
              <div className="text-[10px] text-pm-muted uppercase tracking-wider">Installations</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-pm-cyan">100%</div>
              <div className="text-[10px] text-pm-muted uppercase tracking-wider">DOM Precision</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-white">10x</div>
              <div className="text-[10px] text-pm-muted uppercase tracking-wider">Faster QA Loops</div>
            </div>
          </motion.div>
        </div>

        {/* Right Column (Interactive Demo Showcase) */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="lg:col-span-7 relative w-full aspect-[4/3] rounded-2xl border border-pm-border bg-pm-surface/40 overflow-hidden shadow-2xl"
        >
          {/* Simulated Browser Frame */}
          <div className="absolute top-0 left-0 right-0 h-10 border-b border-pm-border bg-pm-surface-2 flex items-center px-4 justify-between z-20">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
            </div>
            <div className="px-4 py-1 bg-pm-bg border border-pm-border rounded-md text-[10px] font-mono text-pm-muted w-1/2 text-center select-none truncate">
              https://opinvox.entrext.com/
            </div>
            <div className="w-8" />
          </div>

          {/* Simulated Webpage Contents */}
          <div className="absolute inset-0 pt-10 px-8 flex flex-col justify-start items-center bg-pm-bg font-sans z-0 select-none">
            {/* Header bar of target page */}
            <div className="w-full flex items-center justify-between py-4 border-b border-pm-border/30">
              <span className="font-display text-xs font-bold text-pm-text">OpinVox</span>
              <div className="flex gap-4 text-[10px] text-pm-muted">
                <span>Pricing</span>
                <span>Explore</span>
                <span>FAQ</span>
              </div>
            </div>

            {/* Hero contents of target page */}
            <div className="text-center mt-12 space-y-4 max-w-sm">
              <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent-vivid bg-pm-accent/10 px-2.5 py-0.5 rounded-full border border-pm-accent/20">
                Active Arena
              </span>
              <h2 id="demo-heading" className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                Where Logic Strikes. <br /> Minds Evolve.
              </h2>
              <p className="text-[10px] text-pm-muted leading-relaxed">
                Step into the high-stakes arena of structured live debates.
              </p>
              
              <button 
                id="demo-cta-btn"
                className="inline-block px-5 py-2.5 bg-pm-accent hover:bg-pm-accent-bright text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
              >
                JOIN THE BATTLE
              </button>
            </div>

            {/* Feedback Pins dropped on elements */}
            <AnimatePresence>
              {(demoStep === 1 || demoStep === 2) && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="absolute left-[60%] top-[65%] -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-pm-accent/40 animate-ping opacity-75" />
                    <div className="w-4 h-4 rounded-full bg-pm-accent border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg">
                      1
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {demoStep === 3 && (
                <>
                  {/* Pin 1 Stays */}
                  <div className="absolute left-[60%] top-[65%] -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-4 h-4 rounded-full bg-pm-accent-mid border border-pm-accent-bright/60 flex items-center justify-center text-[8px] font-bold text-pm-accent-vivid shadow-lg">
                      1
                    </div>
                  </div>

                  {/* Pin 2 Drops */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="absolute left-[25%] top-[25%] -translate-x-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-pm-cyan/40 animate-ping opacity-75" />
                      <div className="w-4 h-4 rounded-full bg-pm-cyan border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg">
                        2
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Virtual Mouse Cursor */}
          <motion.div
            animate={{
              x: cursorCoords[demoStep].x,
              y: cursorCoords[demoStep].y,
            }}
            transition={{
              duration: 1.2,
              ease: 'easeInOut',
            }}
            className="absolute z-30 pointer-events-none text-pm-accent-bright"
            style={{ left: 0, top: 0 }}
          >
            <MousePointer2 className="w-5 h-5 fill-current filter drop-shadow-md" />
          </motion.div>

          {/* Floating Drawer Overlay */}
          <AnimatePresence>
            {(demoStep === 1 || demoStep === 3) && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="absolute right-0 top-10 bottom-0 w-[240px] bg-pm-surface-2 border-l border-pm-border z-10 p-4 font-mono text-[9px] text-pm-text flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-pm-border pb-2">
                    <span className="font-display font-bold text-[10px] text-white">LEAVE FEEDBACK</span>
                    <span className="px-1.5 py-0.5 rounded bg-pm-accent/20 text-pm-accent-vivid text-[8px] font-bold">DRAFT</span>
                  </div>

                  {/* DOM element context details */}
                  <div className="space-y-2">
                    <div className="bg-pm-bg p-2 rounded border border-pm-border">
                      <span className="text-pm-cyan font-bold block mb-1">
                        {demoStep === 1 ? '<button#demo-cta-btn>' : '<h2#demo-heading>'}
                      </span>
                      <span className="text-pm-muted text-[8px] block break-all">
                        {demoStep === 1 
                          ? 'html > body > main > div > button.btn-cta' 
                          : 'html > body > main > div > div > h2'
                        }
                      </span>
                    </div>

                    <div className="bg-pm-bg p-2 rounded border border-pm-border space-y-1">
                      <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Computed CSS</div>
                      <div className="flex justify-between">
                        <span>Display:</span>
                        <span className="text-white">{demoStep === 1 ? 'inline-block' : 'block'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Width:</span>
                        <span className="text-white">{demoStep === 1 ? '160px' : '384px'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Height:</span>
                        <span className="text-white">{demoStep === 1 ? '40px' : '64px'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock feedback form values */}
                  <div className="space-y-2">
                    <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold">Feedback Info</div>
                    <div className="bg-pm-bg p-2 rounded border border-pm-border">
                      <div className="text-white font-semibold">
                        {demoStep === 1 ? 'Hover states are sluggish' : 'Heading overlaps nav on mobile'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-pm-bg p-1 rounded border border-pm-border text-center">
                        <span className="text-[8px] text-pm-accent-vivid">LAYOUT</span>
                      </div>
                      <div className="flex-1 bg-pm-bg p-1 rounded border border-pm-border text-center">
                        <span className="text-[8px] text-red-400">HIGH</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-pm-border flex gap-2">
                  <button className="flex-1 py-1.5 rounded bg-pm-accent text-white text-center font-bold text-[8px] uppercase tracking-wider">
                    Submit Pin
                  </button>
                  <button className="py-1.5 px-2.5 rounded bg-pm-surface-3 text-pm-muted text-center font-bold text-[8px] uppercase tracking-wider">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Technical Diagnostics watermark */}
          <div className="absolute bottom-2 left-4 font-mono text-[8px] text-pm-muted/30 pointer-events-none select-none">
            [PixelMark Lens v4.0.2] DOM Injection Node Active
          </div>
        </motion.div>

      </div>
    </section>
  );
}
