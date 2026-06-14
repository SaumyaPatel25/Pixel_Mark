'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export default function EntrextSection() {
  return (
    <section id="entrext" className="relative py-24 bg-pm-bg overflow-hidden border-t border-pm-border">
      <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Partnership Card with Gradient Border and Glow */}
        <div className="relative p-8 md:p-12 rounded-3xl border border-pm-border-bright bg-pm-surface-2/30 shadow-glow-lg overflow-hidden flex flex-col items-center text-center space-y-6">
          <div className="absolute inset-0 bg-gradient-to-tr from-pm-accent-subtle via-transparent to-pm-cyan-subtle pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pm-cyan-subtle border border-pm-cyan/20 text-pm-cyan text-[10px] font-bold uppercase tracking-widest">
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
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <a
              href="https://entrextlabs.entrext.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-accent hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
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
        </div>

      </div>
    </section>
  );
}
