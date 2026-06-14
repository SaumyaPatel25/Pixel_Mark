'use client';

import { motion } from 'framer-motion';
import { Camera, Terminal, Shield, Terminal as ConsoleIcon, Database, ArrowUpRight, Share2, Users, Layers, ExternalLink } from 'lucide-react';

export default function FeaturesSection() {
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
    <section id="features" className="relative py-24 bg-pm-bg overflow-hidden border-t border-pm-border">
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
          className="grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {/* Main Feature: Zero-Install Flow (Wide Card) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-8 p-8 rounded-2xl border border-pm-border bg-pm-surface-2/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_60%)]" />
            <div className="space-y-4 max-w-xl">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Zero-Install Reviewer Flow
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Reviewers and clients do not need to install browser extensions, download software, or even create a PixelMark account. They click the secure session share link and start pinning feedback immediately directly on the live website sandbox.
              </p>
            </div>
            <div className="pt-6 flex items-center gap-2 text-pm-accent-vivid font-mono text-[10px] font-bold tracking-widest uppercase cursor-pointer group-hover:text-white transition-colors">
              <span>View Security Spec</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

          {/* Feature: Auto Screenshot */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Auto Screenshot
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Pixel-perfect screenshots capture the exact state of the viewport, with a purple overlay highlighted rect bounding the clicked element.
              </p>
            </div>
          </motion.div>

          {/* Feature: DOM Snapshot */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                DOM Snapshot & styles
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Inspect raw innerHTML, computed CSS values (width, height, display, z-index), and element boundaries in a clean technical side-panel.
              </p>
            </div>
          </motion.div>

          {/* Feature: XPath + CSS Selector */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                XPath & Selector target
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Generates robust DOM CSS selectors and absolute XPaths. Our selector strategy ensures markers stay pinned even when you restructure layouts.
              </p>
            </div>
          </motion.div>

          {/* Feature: Console + Network Errors */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <ConsoleIcon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Console & Network audits
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Detects asset failures, CORS blockages, and JavaScript errors automatically at the moment of pin drop, grouping them inside the drawer context.
              </p>
            </div>
          </motion.div>

          {/* Feature: Priority & Status Workflow */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Workflow states
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Change status (New, In Progress, Resolved) and severity (Low, Medium, High, Critical) directly in the UI. Form inputs lock dynamically when resolved.
              </p>
            </div>
          </motion.div>

          {/* Feature: WebSocket Live Sync */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                WebSocket live sync
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Allows multiple reviewers to view, place, and resolve pins simultaneously with real-time overlay synchronization and live cursor tracking.
              </p>
            </div>
          </motion.div>

          {/* Feature: Export Anywhere */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 p-8 rounded-2xl border border-pm-border bg-pm-surface/40 relative overflow-hidden group hover:border-pm-accent/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pm-accent-vivid transition-colors">
                Export & sync
              </h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Export session feedback to clean Markdown documents, raw JSON datasets, or push them directly to GitHub issues in one click.
              </p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
