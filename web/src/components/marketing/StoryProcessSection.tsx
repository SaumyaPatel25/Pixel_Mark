'use client';

import { motion } from 'framer-motion';
import { Share2, MousePointerClick, Database, Sparkles, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Share2,
    badge: 'STAGE 1: GENERATE & SHARE',
    title: 'Input your site & share review links',
    description:
      'Enter your live staging URL or local development port. STAGE generates a secure, sandboxed review link in seconds—no dev config or Chrome extensions required.',
    color: 'from-blue-500/20 to-indigo-500/20 text-indigo-500 dark:text-indigo-400',
    borderColor: 'border-indigo-500/20',
    visual: (
      <div className="rounded-xl border border-pm-border bg-pm-surface-2 p-3 space-y-2 text-[9px] font-mono shadow-sm max-w-[280px] mx-auto">
        <div className="flex items-center gap-1.5 opacity-60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>review-session-ready</span>
        </div>
        <div className="p-2 rounded bg-pm-surface border border-pm-border text-center truncate">
          https://stage.io/review/share-abc
        </div>
      </div>
    )
  },
  {
    number: '02',
    icon: MousePointerClick,
    badge: 'STAGE 2: PIN FEEDBACK',
    title: 'Clients click directly to pin comments',
    description:
      'Reviewers simply click any live element to drop comments. STAGE records the exact node target—no more guessing what "button on the left" refers to.',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500 dark:text-emerald-400',
    borderColor: 'border-emerald-500/20',
    visual: (
      <div className="relative rounded-xl border border-pm-border bg-pm-surface-2 p-4 text-[9px] shadow-sm max-w-[280px] mx-auto flex items-center justify-center">
        <div className="px-4 py-2 border border-dashed border-[#1D264F] rounded bg-white text-pm-text font-bold uppercase relative">
          CTA Button
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white bg-pm-accent flex items-center justify-center text-[7px] text-white font-bold shadow-lg">
            1
          </div>
        </div>
      </div>
    )
  },
  {
    number: '03',
    icon: Database,
    badge: 'STAGE 3: COLLECT CONTEXT',
    title: 'STAGE compiles absolute specs',
    description:
      'Each pin compiles absolute XPath routes, CSS layout properties (z-index, padding), and JavaScript console traces. Devs get diagnostic data on load.',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-500 dark:text-amber-400',
    borderColor: 'border-amber-500/20',
    visual: (
      <div className="rounded-xl border border-pm-border bg-pm-surface-2 p-3 space-y-1.5 text-[8.5px] font-mono shadow-sm max-w-[280px] mx-auto text-left">
        <div className="text-pm-text/60 border-b border-pm-border pb-1 font-bold">SPECIFICATIONS PACK</div>
        <div>Selector: <span className="text-violet-500 font-bold">html &gt; body &gt; main &gt; btn</span></div>
        <div>Viewport: <span className="text-sky-500 font-bold">1440 x 900 px</span></div>
        <div>Console: <span className="text-rose-500 font-bold">0 Runtime Errors</span></div>
      </div>
    )
  },
  {
    number: '04',
    icon: CheckCircle2,
    badge: 'STAGE 4: RAPID RESOLUTION',
    title: 'Review thread resolved & project closed',
    description:
      'Align on changes immediately. Devs resolve review tickets, export stylesheet patches, and close high-value client builds 3x faster.',
    color: 'from-purple-500/20 to-fuchsia-500/20 text-purple-500 dark:text-purple-400',
    borderColor: 'border-purple-500/20',
    visual: (
      <div className="rounded-xl border border-pm-border bg-pm-surface-2 p-4 text-[9px] shadow-sm max-w-[280px] mx-auto flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <span className="font-bold text-pm-text">All 18 pins resolved!</span>
      </div>
    )
  }
];

export default function StoryProcessSection() {
  return (
    <section 
      id="product-journey" 
      className="relative py-32 bg-transparent overflow-hidden border-t border-pm-border/30"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 1000px' }}
    >
      {/* Soft atmospheric gradient washes */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#E2F3F5]/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#C7B4D6]/10 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Process Header */}
        <div className="max-w-3xl mb-24 space-y-4 text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Product Walkthrough
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-black tracking-tight text-pm-text leading-[1.05] uppercase italic">
            How STAGE transforms<br />
            <span className="text-[#1D264F] dark:text-transparent dark:bg-gradient-to-r dark:from-indigo-400 dark:to-emerald-400 dark:bg-clip-text">
              website review cycles.
            </span>
          </h2>
          <p className="text-pm-text/60 max-w-xl text-sm sm:text-base leading-relaxed">
            One link replaces countless vague annotations, screenshots, and comments. Here is how it works end-to-end.
          </p>
        </div>

        {/* Steps Loop (Alternating Layout) */}
        <div className="space-y-24 relative before:absolute before:inset-y-4 before:left-4 lg:before:left-1/2 before:w-[1px] before:bg-pm-border/30">
          {steps.map((step, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex flex-col lg:flex-row gap-8 lg:gap-16 items-start lg:items-center ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
              >
                {/* Visual Side */}
                <div className="w-full lg:w-1/2 flex items-center justify-center z-10 order-2 lg:order-1">
                  <div className={`p-8 rounded-3xl border ${step.borderColor} bg-gradient-to-b ${step.color} w-full max-w-sm backdrop-blur-md shadow-sm`}>
                    {step.visual}
                  </div>
                </div>

                {/* Narrative Text Side */}
                <div className="w-full lg:w-1/2 space-y-4 text-left order-1 lg:order-2 pl-12 lg:pl-0">
                  {/* Floating Number Pin */}
                  <div className="absolute left-1.5 lg:left-1/2 top-0 -translate-x-1/2 w-6 h-6 rounded-full bg-pm-surface border border-pm-border flex items-center justify-center font-mono text-[9px] font-bold text-pm-text shadow-sm z-20">
                    {step.number}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-mono font-bold tracking-wider text-pm-accent-bright dark:text-pm-accent-vivid bg-pm-accent-subtle border border-pm-border px-2 py-0.5 rounded">
                      {step.badge}
                    </span>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-pm-text">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-[12.5px] leading-relaxed text-pm-text/70 max-w-md">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
