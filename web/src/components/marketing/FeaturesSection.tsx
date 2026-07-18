'use client';

import { motion } from 'framer-motion';
import { GlassTiltCard } from '@/components/marketing/GlassTiltCard';
import { Camera, Terminal, Shield, Sparkles, Share2, Users, Layers, ExternalLink, HelpCircle, Code2, Cpu } from 'lucide-react';

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
    <section 
      id="features" 
      className="relative py-36 bg-transparent overflow-hidden border-t border-pm-border/30"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 1000px' }}
    >
      {/* Bloom gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#C7B4D6]/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#E2F3F5]/30 rounded-full blur-[100px] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-6 md:px-12 relative z-10"
      >
        
        {/* Section Header */}
        <div className="max-w-3xl mb-20 space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80] bg-[#E2F3F5] px-3 py-1 rounded-full border border-[#E2F3F5]">
            PRODUCT CAPABILITIES
          </span>
          <h2 className="mkt-section-h2 font-display font-extrabold text-[#1D264F]"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.04, letterSpacing: '-0.03em' }}
          >
            Everything developers need.<br />
            <span className="mkt-section-h2-sub">Nothing clients have to learn.</span>
          </h2>
          <p className="text-sm md:text-base text-pm-muted leading-relaxed max-w-xl font-sans pt-2">
            A visual bug reporting tool and collaboration dashboard built directly on top of raw browser engines.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Card 1: Interactive Pin Engine (Double Width) */}
          <GlassTiltCard
            className="md:col-span-2 border-pm-border bg-pm-surface hover:border-pm-accent/40 hover:shadow-[0_24px_50px_-16px_var(--pm-accent-glow)] transition-all duration-300 min-h-[320px]"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="flex flex-col md:flex-row justify-between gap-8 h-full items-stretch">
              <div className="space-y-4 max-w-sm flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-pm-accent-subtle flex items-center justify-center text-pm-accent">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-pm-text">
                    Interactive DOM-Level Pin Engine
                  </h3>
                  <p className="text-xs text-pm-muted leading-relaxed font-sans">
                    Click any live website element to anchor your QA feedback. Our engine captures the exact CSS selector path, browser engine version, and viewport size dynamically.
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <span className="text-[10px] font-mono font-bold bg-pm-accent-subtle text-pm-accent px-2.5 py-1 rounded">
                    CSS PATHS
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-pm-surface-2 border border-pm-border text-pm-accent px-2.5 py-1 rounded">
                    XPATH MAPS
                  </span>
                </div>
              </div>

              {/* Bento Visual Side */}
              <div className="flex-1 min-h-[160px] bg-pm-surface-2 rounded-2xl border border-pm-border p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-mono text-pm-text-faint">
                  <span>ELEMENT SELECTOR</span>
                  <span className="text-emerald-500 font-bold">READY</span>
                </div>
                <div className="py-4 space-y-2">
                  <div className="p-2.5 bg-pm-surface border border-pm-border rounded-xl shadow-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pm-accent animate-pulse" />
                    <span className="font-mono text-[10px] text-pm-text font-bold">button.btn-signup-hero</span>
                  </div>
                  <div className="p-2.5 bg-pm-surface border border-pm-border rounded-xl shadow-sm flex items-center gap-2 opacity-50">
                    <span className="w-1.5 h-1.5 rounded-full bg-pm-text-faint" />
                    <span className="font-mono text-[10px] text-pm-text">div.nav-wrapper &gt; a.logo</span>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-pm-text-faint">
                  [Node matched on 100% of viewports]
                </div>
              </div>
            </div>
          </GlassTiltCard>

          {/* Card 2: Zero Extension Install (Single Width) */}
          <GlassTiltCard
            className="border-pm-border bg-pm-surface hover:border-pm-accent/40 hover:shadow-[0_24px_50px_-16px_var(--pm-accent-glow)] transition-all duration-300"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-pm-accent-subtle flex items-center justify-center text-pm-accent">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-pm-text">
                  Zero Plugin Install
                </h3>
                <p className="text-xs text-pm-muted leading-relaxed font-sans">
                  Generate secure, lightweight review links that load directly inside any standard desktop or mobile web browser. No plugins required.
                </p>
              </div>

              <div className="p-3.5 bg-pm-surface-2 border border-pm-border rounded-xl flex items-center justify-between text-[10px] font-mono">
                <span className="text-pm-accent font-semibold">pixelmark.co/t/294f</span>
                <span className="text-pm-text-faint">Copy</span>
              </div>
            </div>
          </GlassTiltCard>

          {/* Card 3: Specifications Inspector (Single Width) */}
          <GlassTiltCard
            className="border-pm-border bg-pm-surface hover:border-pm-accent/40 hover:shadow-[0_24px_50px_-16px_var(--pm-accent-glow)] transition-all duration-300"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-pm-accent-subtle flex items-center justify-center text-pm-accent">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-pm-text">
                  Layout Inspector
                </h3>
                <p className="text-xs text-pm-muted leading-relaxed font-sans">
                  Every submitted pin includes complete layout specs, browser client metadata, display resolutions, and viewport dimensions.
                </p>
              </div>

              <div className="bg-pm-bg border border-pm-border rounded-xl p-3 font-mono text-[9px] text-pm-accent space-y-1">
                <div>browser: Chrome v126</div>
                <div>viewport: 1920x1080</div>
                <div>os: Windows 11</div>
              </div>
            </div>
          </GlassTiltCard>

          {/* Card 4: WebSocket Collaboration Sync (Double Width) */}
          <GlassTiltCard
            className="md:col-span-2 border-pm-border bg-pm-surface hover:border-pm-accent/40 hover:shadow-[0_24px_50px_-16px_var(--pm-accent-glow)] transition-all duration-300 min-h-[320px]"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
              const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
              onHoverChange({ x, y });
            }}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="flex flex-col md:flex-row justify-between gap-8 h-full items-stretch">
              <div className="space-y-4 max-w-sm flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-pm-accent-subtle flex items-center justify-center text-pm-accent">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-pm-text">
                    Real-time Presence Sync
                  </h3>
                  <p className="text-xs text-pm-muted leading-relaxed font-sans">
                    Collaborate live over standard WebSocket connections. View active developers and reviewers, track cursor placements, and see feedback updates sync in real-time.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-pm-text-faint/80">
                  POWERED BY REDIS PUB/SUB SYNC LAYER
                </div>
              </div>

              {/* Bento Visual Side */}
              <div className="flex-1 min-h-[160px] bg-pm-surface-2 rounded-2xl border border-pm-border p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-mono text-pm-text-faint">
                  <span>ACTIVE TEAM SESSIONS</span>
                  <span className="text-pm-accent font-bold">2 PARTICIPANTS</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-pm-surface border border-pm-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-pm-accent-subtle flex items-center justify-center text-pm-accent text-[9px] font-bold">S</div>
                      <span className="text-[11px] font-semibold text-pm-text">Sarah (Product Lead)</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-pm-surface border border-pm-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-pm-surface-2 border border-pm-border flex items-center justify-center text-pm-accent text-[9px] font-bold">M</div>
                      <span className="text-[11px] font-semibold text-pm-text">Michael (Client Reviewer)</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>

                <div className="text-[9px] font-mono text-pm-text-faint">
                  [Socket synced: latency &lt; 15ms]
                </div>
              </div>
            </div>
          </GlassTiltCard>
        </motion.div>

      </motion.div>
    </section>
  );
}
