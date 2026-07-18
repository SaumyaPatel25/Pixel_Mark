'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, TrendingUp, Zap, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function OutcomeSection() {
  const metrics = [
    {
      icon: TrendingUp,
      value: '-60%',
      label: 'Fewer Revision Cycles',
      desc: 'Clarity converts feedback into rapid, precise iterations on live DOM elements.',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      icon: Zap,
      value: '3x',
      label: 'Faster Project Approvals',
      desc: 'No login required for clients means feedback arrives immediately, keeping sprints on track.',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: MessageSquare,
      value: '0',
      label: 'Vague Screenshots',
      desc: 'XPath mappings and viewport specs compile automatically with every single feedback pin.',
      color: 'text-rose-600 dark:text-rose-400'
    }
  ];

  const outcomes = [
    {
      metric: 'Outcome 01',
      quote: '“One review link replaced 12 scattered emails and screenshot threads.”',
      author: 'Freelance Frontend Developer',
      context: 'Client design sign-off'
    },
    {
      metric: 'Outcome 02',
      quote: '“The team got 18 precise pins with layout specs instead of 1 vague PDF markup.”',
      author: 'QA Lead, Creative Agency',
      context: 'Pre-launch sandbox audit'
    },
    {
      metric: 'Outcome 03',
      quote: '“Client approval happened in 1 clean review round instead of our typical 3.”',
      author: 'Studio Director, Design Agency',
      context: 'Final deployment review'
    }
  ];

  return (
    <section 
      id="outcomes" 
      className="relative py-32 bg-transparent overflow-hidden border-t border-pm-border/30"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 800px' }}
    >
      {/* Subtle atmospheric glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#E2F3F5]/10 rounded-full blur-[120px] pointer-events-none z-0" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10 space-y-24">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            Client Outcomes
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-pm-text uppercase italic leading-[1.05]">
            Real results. <br />
            <span className="text-[#1D264F] dark:text-transparent dark:bg-gradient-to-r dark:from-indigo-400 dark:to-emerald-400 dark:bg-clip-text">
              No marketing hype.
            </span>
          </h2>
          <p className="text-pm-text/60 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            We measure value in saved dev hours, eliminated back-and-forth messages, and faster client signatures.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {metrics.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative p-8 rounded-3xl border border-pm-border bg-pm-surface-2/50 backdrop-blur-md shadow-sm space-y-4 text-left"
            >
              <div className="flex items-center justify-between">
                <span className={`text-4xl sm:text-5xl font-black font-display tracking-tight ${m.color}`}>
                  {m.value}
                </span>
                <m.icon className={`w-6 h-6 opacity-60 ${m.color}`} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-pm-text">{m.label}</h3>
                <p className="text-[11.5px] leading-relaxed text-pm-text/60">{m.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Case Studies / Comparative Quotes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
          {outcomes.map((o, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="p-6 rounded-2xl border border-pm-border/60 bg-pm-surface/30 backdrop-blur-md text-left flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <span className="text-[9px] font-mono font-bold tracking-widest text-pm-accent-bright dark:text-pm-accent-vivid bg-pm-accent-subtle border border-pm-border px-2 py-0.5 rounded">
                  {o.metric}
                </span>
                <p className="text-sm font-medium italic leading-relaxed text-pm-text">
                  {o.quote}
                </p>
              </div>
              <div className="border-t border-pm-border/30 pt-4 flex items-center justify-between text-[10px]">
                <span className="font-bold text-pm-text">{o.author}</span>
                <span className="text-pm-text/50 font-mono">{o.context}</span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
