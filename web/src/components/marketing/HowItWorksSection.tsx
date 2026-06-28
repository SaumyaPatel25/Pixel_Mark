'use client';

import { motion } from 'framer-motion';
import { Share2, MousePointerClick, Camera, Code, ArrowRight } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: Share2,
      title: 'Paste your site URL',
      description: 'Enter your website URL. We spin up an interactive review session instantly.'
    },
    {
      number: '02',
      icon: MousePointerClick,
      title: 'Pin feedback directly on the page',
      description: 'Click any element to drop a feedback pin exactly where the issue is. Add comments and suggestions.'
    },
    {
      number: '03',
      icon: Camera,
      title: 'Share a client link — they add notes too',
      description: 'Send clients a secure review link. They see the live site and can leave feedback without needing to log in.'
    },
    {
      number: '04',
      icon: Code,
      title: 'Track and fix in your Review Inbox',
      description: 'See every feedback pin mapped with CSS selectors, browser state, and screenshots in one dashboard.'
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  return (
    <section id="how-it-works" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
            From URL to fix in 4 steps
          </h2>
          <p className="text-sm text-pm-muted leading-relaxed">
            A frictionless feedback loop designed to bridge the gap between design reviews and codebase fixes.
          </p>
        </div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="relative p-6 rounded-xl border border-pm-border bg-pm-surface/40 flex flex-col justify-between h-full group hover:border-pm-accent/30 transition-all duration-300"
            >
              {/* Desktop connecting arrow (between cards) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 translate-x-1/2 z-10 text-pm-border group-hover:text-pm-accent/30 transition-colors duration-300">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}

              <div className="space-y-4">
                {/* Step Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-pm-accent-vivid tracking-widest">
                    STEP {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-pm-surface-2 border border-pm-border flex items-center justify-center text-pm-accent group-hover:text-pm-accent-bright transition-colors duration-300">
                    <step.icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Step Body */}
                <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-xs text-pm-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
