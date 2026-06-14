'use client';

import { motion } from 'framer-motion';
import { Target, ShieldCheck, Zap, Database, Clock } from 'lucide-react';

export default function AboutSection() {
  const philosophies = [
    {
      icon: Target,
      title: 'Zero friction for reviewers',
      desc: 'No login forms, browser downloads, or extensions. Just click and pin.'
    },
    {
      icon: ShieldCheck,
      title: 'Maximum context for devs',
      desc: 'XPath, computed CSS, full screenshots, and console logs are captured automatically.'
    },
    {
      icon: Zap,
      title: 'No extensions required',
      desc: 'Our proxy rewriter injects the lightweight capture agent directly in the runtime.'
    },
    {
      icon: Database,
      title: 'Open and exportable data',
      desc: 'One-click markdown summaries, raw JSON data logs, and GitHub issue syncing.'
    },
    {
      icon: Clock,
      title: 'Real-time by default',
      desc: 'WebSocket channels synchronize feedback pins instantly across active screens.'
    }
  ];

  return (
    <section id="about" className="relative py-24 bg-pm-bg overflow-hidden border-t border-pm-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column - Story Copy */}
        <div className="lg:col-span-6 space-y-6">
          <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
            The Story
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Built to end the <br />
            <span className="text-gradient-purple font-black">"it looks broken"</span> email.
          </h2>
          <div className="space-y-4 text-xs md:text-sm text-pm-muted leading-relaxed">
            <p>
              We’ve all received it. A client clicks a button, it doesn’t work, and they write: <em>"The button is broken, please fix."</em> No screenshot. No browser info. No console logs or error traces.
            </p>
            <p>
              As developers, we spend hours debugging issues that could be resolved in minutes if we had the right context. We built PixelMark at <strong>Entrext Labs</strong> to bridge this gap.
            </p>
            <p>
              By translating visual clicks directly into precision DOM elements, selectors, and diagnostics, we eliminate QA friction. Reviewers get to give feedback in a simple visual way, and developers get the exact context they need to make the fix.
            </p>
          </div>
        </div>

        {/* Right Column - Product Philosophy Glass Panel */}
        <div className="lg:col-span-6">
          <div className="p-8 rounded-2xl border border-pm-border bg-pm-surface/40 backdrop-blur-xl relative overflow-hidden flex flex-col gap-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.08),transparent_60%)]" />
            
            <h3 className="font-display text-lg font-bold text-white tracking-tight border-b border-pm-border pb-3">
              Product Philosophy
            </h3>

            <div className="space-y-5">
              {philosophies.map((phil, index) => (
                <div key={index} className="flex gap-4 items-start text-left">
                  <div className="w-8 h-8 rounded-lg bg-pm-accent-subtle border border-pm-border-bright flex items-center justify-center text-pm-accent-vivid flex-shrink-0">
                    <phil.icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">{phil.title}</h4>
                    <p className="text-[10px] text-pm-muted leading-normal">{phil.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
