'use client';

import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export default function EntrextSection() {
  const cardX = useMotionValue(0.5);
  const cardY = useMotionValue(0.5);
  
  // Smooth spring transformations for 3D tilt
  const tiltX = useSpring(useTransform(cardY, [0, 1], [6, -6]), { stiffness: 150, damping: 20 });
  const tiltY = useSpring(useTransform(cardX, [0, 1], [-6, 6]), { stiffness: 150, damping: 20 });
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
    ([x, y]) => `radial-gradient(circle at ${Number(x) * 100}% ${Number(y) * 100}%, rgba(6,182,212,0.12) 0%, rgba(124,58,237,0.08) 50%, transparent 80%)`
  );

  return (
    <section id="entrext" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border">
      <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Partnership Card with Gradient Border and Glow */}
        <motion.div 
          style={{
            rotateX: tiltX,
            rotateY: tiltY,
            transformStyle: 'preserve-3d',
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`relative p-8 md:p-12 rounded-3xl border bg-pm-surface-2/30 overflow-hidden flex flex-col items-center text-center space-y-6 transition-all duration-500 cursor-default ${
            isHovered
              ? 'border-pm-cyan/40 shadow-[0_0_50px_rgba(6,182,212,0.15),0_0_50px_rgba(124,58,237,0.15)]'
              : 'border-pm-border-bright shadow-glow-lg'
          }`}
        >
          {/* Static Ambient Color layer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-pm-accent-subtle via-transparent to-pm-cyan-subtle pointer-events-none" />

          {/* Interactive cursor tracking spotlight glow */}
          <motion.div
            style={{ background: spotlightBg }}
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 hover:opacity-100"
          />

          {/* Pixel Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(6,182,212,0.06)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40 hover:opacity-100 transition-opacity duration-500" />
          
          {/* Sweeping scanline */}
          <motion.div
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            className={`absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-pm-cyan/30 to-transparent pointer-events-none transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${
            isHovered 
              ? 'bg-pm-cyan/20 border-pm-cyan/40 text-pm-cyan shadow-[0_0_12px_rgba(6,182,212,0.3)]' 
              : 'bg-pm-cyan-subtle border-pm-cyan/20 text-pm-cyan'
          }`}>
            <span>✦ Entrext Labs</span>
          </div>

          {/* Title */}
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Built by Entrext Labs
          </h2>

          {/* Body */}
          <p className="text-xs md:text-sm text-pm-muted leading-relaxed max-w-2xl">
            PixelMark is developed and supported by Entrext Labs, an engineering group focused on building collaboration layers for the modern web. We build tools that make it easier for designers, developers, QA leads, and stakeholders to launch websites with absolute confidence.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center pt-2 relative z-10">
            <a
              href="https://entrextlabs.entrext.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-500 flex items-center gap-2 group cursor-pointer ${
                isHovered 
                  ? 'bg-pm-accent-bright text-white shadow-accent scale-[1.02]' 
                  : 'bg-pm-accent text-white shadow-accent'
              }`}
            >
              Visit Entrext
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="https://www.linkedin.com/company/entrext/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-text border border-pm-border rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              Partner with Entrext Labs
            </a>
          </div>

          {/* Partnership Badge Strip */}
          <div className="pt-8 border-t border-pm-border w-full flex items-center justify-center gap-8 md:gap-12 opacity-60 text-pm-muted text-[10px] font-mono select-none">
            <span className="font-display font-bold text-white tracking-wide">PIXELMARK</span>
            <span className="text-pm-border-bright text-lg font-light">×</span>
            <span className="font-display font-semibold text-pm-cyan tracking-wider">ENTREXT LABS</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
