'use client';

import { motion } from 'framer-motion';
import { GlassTiltCard } from '@/components/marketing/GlassTiltCard';
import { Camera, Terminal, Shield, Terminal as ConsoleIcon, Database, ArrowUpRight, Share2, Users, Layers, ExternalLink } from 'lucide-react';

interface FeaturesSectionProps {
  onHoverChange: (pos: { x: number; y: number } | null) => void;
}

export default function FeaturesSection({ onHoverChange }: FeaturesSectionProps) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
    <section id="features" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border/30">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Everything a developer needs. <br />
            <span className="text-gradient-purple">Nothing a reviewer has to learn.</span>
          </h2>
        </div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Column 1 (For Clients) */}
          <GlassTiltCard
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid text-xl">
                🎯
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Website annotation tool built for speed
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Click any element to drop a feedback pin exactly where the issue is. Use our visual website annotation tool to leave clear QA notes without taking screenshots or writing 'the button on the third section.'
              </p>
            </div>
          </GlassTiltCard>

          {/* Column 2 (For Developers) */}
          <GlassTiltCard
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid text-xl">
                ⚡
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Integrated UI feedback tool for devs
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Every feedback pin automatically records layout specs, browser version, device, and viewport size. A developer-ready UI feedback tool that eliminates back-and-forth QA emails.
              </p>
            </div>
          </GlassTiltCard>

          {/* Column 3 (For Teams) */}
          <GlassTiltCard
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid text-xl">
                🔗
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Secure client review links instantly
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Generate secure client review links to share with stakeholders. They click, review layout changes, and add comments. No Chrome extension, login, or installation required.
              </p>
            </div>
          </GlassTiltCard>
        </motion.div>

      </div>
    </section>
  );
}
