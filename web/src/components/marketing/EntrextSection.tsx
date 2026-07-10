'use client';

import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function EntrextSection() {
  const cardX = useMotionValue(0.5);
  const cardY = useMotionValue(0.5);
  
  // Smooth spring transformations for 3D tilt
  const tiltX = useSpring(useTransform(cardY, [0, 1], [4, -4]), { stiffness: 150, damping: 22 });
  const tiltY = useSpring(useTransform(cardX, [0, 1], [-4, 4]), { stiffness: 150, damping: 22 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    const rect = e.currentTarget.getBoundingClientRect();
    cardX.set((e.clientX - rect.left) / rect.width);
    cardY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    cardX.set(0.5);
    cardY.set(0.5);
  };

  // Cursor tracking spotlight color sweep
  const spotlightBg = useTransform(
    [cardX, cardY],
    ([x, y]) => `radial-gradient(circle at ${Number(x) * 100}% ${Number(y) * 100}%, rgba(66, 116, 217, 0.08) 0%, rgba(41, 54, 129, 0.04) 50%, transparent 80%)`
  );

  return (
    <section id="entrext" className="relative py-36 bg-transparent overflow-hidden border-t border-pm-border/30">
      {/* Soft atmospheric washes */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#E2F3F5]/20 rounded-full blur-[110px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#FCE2E1]/10 rounded-full blur-[110px] pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10 space-y-32">
        
        {/* =========================================================================
            UPPER TIER: MAJESTIC FINAL CTA CLOSE
            ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-8 max-w-3xl mx-auto"
        >
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80] bg-[#253B80]/5 px-3.5 py-1.5 rounded-full">
            GET STARTED TODAY
          </span>
          
          <h2 className="font-display text-4xl sm:text-5xl lg:text-[4.5rem] font-extrabold tracking-[-0.035em] text-[#1D264F] leading-[1.02]">
            Ready to streamline <br />
            your visual sign-offs?
          </h2>
          
          <p className="text-sm md:text-base text-pm-muted leading-relaxed max-w-xl mx-auto font-sans">
            Spin up a review session in seconds. Collect feedback, annotations, and QA bug reports from clients with zero barriers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="btn-primary-3d w-full sm:w-auto px-8 py-4 bg-[#253B80] hover:bg-[#1B2C60] text-white rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              Create Free Project
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="btn-secondary-3d w-full sm:w-auto px-8 py-4 bg-slate-50 hover:bg-[#FCF5F5] text-pm-text border border-pm-border rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              View Pricing Tier
            </Link>
          </div>

          {/* Core reassurance list */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-[10.5px] text-pm-muted font-mono font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>FREE UNLIMITED CLIENT REVIEWS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>0% PLUGINS OR CODING REQUIRED</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>SECURE CONSOLE & CSS ANCHORING</span>
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            LOWER TIER: PARTNERSHIP / CREATOR DETAILS
            ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <motion.div 
            style={{
              rotateX: tiltX,
              rotateY: tiltY,
              transformStyle: 'preserve-3d',
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative p-8 md:p-12 rounded-3xl border bg-[#FCF5F5] overflow-hidden flex flex-col items-center text-center space-y-6 transition-all duration-500 cursor-default ${
              isHovered
                ? 'border-pm-cyan/40 shadow-[0_20px_60px_-16px_rgba(37,59,128,0.08)]'
                : 'border-pm-border shadow-sm'
            }`}
          >
            {/* Color layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FCE2E1]/10 via-transparent to-[#E2F3F5]/15 pointer-events-none" />

            {/* Interactive spotlight glow */}
            <motion.div
              style={{ background: spotlightBg }}
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 hover:opacity-100"
            />

            {/* Dot Grid overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(37,59,128,0.04)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-50 transition-opacity duration-500" />
            
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pm-cyan/20 bg-pm-cyan-subtle text-pm-cyan text-[10px] font-mono font-bold uppercase tracking-widest">
              <span>✦ Entrext Labs</span>
            </div>

            {/* Title */}
            <h3 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-pm-text leading-tight">
              Designed and supported by <span className="text-[#253B80]">Entrext Labs</span>
            </h3>

            {/* Body */}
            <p className="text-xs md:text-sm text-pm-muted leading-relaxed max-w-2xl font-sans">
              PixelMark is developed by Entrext Labs, an engineering group dedicated to creating visual collaboration layers for the modern web. We build workflows that empower designers, developers, QA leads, and clients to align with absolute confidence.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center pt-2 relative z-10">
              <a
                href="https://entrextlabs.entrext.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-3d px-6 py-3 bg-[#253B80] hover:bg-[#1B2C60] text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 group cursor-pointer"
              >
                Visit Entrext Labs
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <a
                href="https://www.linkedin.com/in/saumya-rajeshbhai-patel-857290372"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary-3d px-6 py-3 bg-slate-50 hover:bg-[#FCF5F5] text-pm-text border border-pm-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2"
              >
                LinkedIn Profile
              </a>
            </div>

            {/* Partnership Badge Strip */}
            <div className="pt-8 border-t border-pm-border w-full flex items-center justify-center gap-6 md:gap-8 opacity-60 text-pm-muted text-[10px] font-mono select-none">
              <span className="font-mono font-bold text-[#1D264F] tracking-wider">PIXELMARK</span>
              <span className="text-pm-border-bright text-sm font-light">×</span>
              <span className="font-mono font-bold text-[#253B80] tracking-wider">ENTREXT LABS</span>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
