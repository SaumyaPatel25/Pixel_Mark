'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, MousePointer2, Search, RefreshCw, Globe, Box, Cpu, Compass, Grid } from 'lucide-react';
import Link from 'next/link';

type SystemCategory = 'dom' | 'threejs' | 'webgl' | 'spa' | 'shadowdom';

export default function HeroSection() {
  const [activeSystem, setActiveSystem] = useState<SystemCategory>('dom');
  const [urlInput, setUrlInput] = useState('https://entrext.com');
  const [currentUrl, setCurrentUrl] = useState('https://entrext.com');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showConversion, setShowConversion] = useState(false);

  // Run the loading simulation when a URL is submitted
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setShowConversion(false);
    setLoadingText('Connecting sandbox...');

    setTimeout(() => {
      setLoadingText('Capturing elements...');
    }, 500);

    setTimeout(() => {
      setLoadingText('Hydrating DOM lens...');
    }, 1000);

    setTimeout(() => {
      setIsLoading(false);
      setCurrentUrl(urlInput);
      // Auto-switch to standard DOM for custom URLs
      setActiveSystem('dom');
    }, 1500);
  };

  // Stagger entry animation variants
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
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  };

  // Systems details
  const systems = [
    {
      id: 'dom' as SystemCategory,
      name: 'Standard DOM',
      icon: Globe,
      color: 'text-purple-400',
      glow: 'shadow-[0_0_20px_rgba(124,58,237,0.15)]',
      border: 'hover:border-purple-500/30',
      accentBg: 'bg-purple-500/10',
      description: 'Resolves waterfall CSS selectors & absolute XPaths.'
    },
    {
      id: 'threejs' as SystemCategory,
      name: 'Three.js 3D',
      icon: Box,
      color: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      border: 'hover:border-cyan-500/30',
      accentBg: 'bg-cyan-500/10',
      description: 'Native 3D raycasting pins comments directly on meshes.'
    },
    {
      id: 'webgl' as SystemCategory,
      name: 'WebGL Shader',
      icon: Grid,
      color: 'text-blue-400',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      border: 'hover:border-blue-500/30',
      accentBg: 'bg-blue-500/10',
      description: 'Drawing buffer snapshots with custom fallback fallback.'
    },
    {
      id: 'spa' as SystemCategory,
      name: 'SPA / Router',
      icon: Compass,
      color: 'text-teal-400',
      glow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]',
      border: 'hover:border-teal-500/30',
      accentBg: 'bg-teal-500/10',
      description: 'Hydrates router viewports dynamically without reloads.'
    },
    {
      id: 'shadowdom' as SystemCategory,
      name: 'Shadow DOM',
      icon: Cpu,
      color: 'text-fuchsia-400',
      glow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)]',
      border: 'hover:border-fuchsia-500/30',
      accentBg: 'bg-fuchsia-500/10',
      description: 'Shadow root traversal captures isolated element nodes.'
    }
  ];

  return (
    <section className="relative min-h-screen pt-[72px] pb-16 flex flex-col justify-center overflow-hidden bg-pm-bg dot-grid">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.12),transparent_65%)]" />
        <div className="absolute top-0 right-0 w-[45%] h-[45%] bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.08),transparent_55%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex-1 flex flex-col justify-center gap-12 relative z-10">
        
        {/* Upper Layout: Text content + Browser preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column (Content) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 flex flex-col justify-center text-left space-y-6"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-pm-accent-subtle border border-pm-border-bright text-pm-accent-vivid text-[10px] font-bold uppercase tracking-widest"
            >
              <Zap className="w-3.5 h-3.5 fill-pm-accent-vivid/20" />
              <span>⚡ Product Sandbox Playground</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]"
            >
              Visual feedback. <br />
              <span className="text-gradient-purple font-black">Resilient by design.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xs md:text-sm text-pm-muted leading-relaxed max-w-lg"
            >
              Drop precision annotation pins on DOM structures, WebGL shaders, Three.js meshes, or Shadow roots. We package selectors, screenshots, and logs instantly—no extensions required.
            </motion.p>

            {/* URL Interactive Input */}
            <motion.form
              variants={itemVariants}
              onSubmit={handleUrlSubmit}
              className="flex items-center gap-2 max-w-md w-full bg-pm-surface/60 border border-pm-border p-1.5 rounded-xl focus-within:border-pm-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 pl-2 text-pm-muted">
                <Search className="w-4 h-4" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste URL to load Sandbox..."
                  className="bg-transparent border-none outline-none text-xs text-pm-text w-full font-mono placeholder:text-pm-text-faint"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-pm-accent hover:bg-pm-accent-bright disabled:bg-pm-surface-3 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load'}
              </button>
            </motion.form>

            <motion.div variants={itemVariants} className="flex gap-4">
              <Link
                href="/auth/register"
                className="px-6 py-3 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-accent hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Start Redesigning Feedback
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column (Playground Browser preview) */}
          <div className="lg:col-span-7 relative w-full aspect-[4/3] rounded-2xl border border-pm-border bg-pm-surface/40 overflow-hidden shadow-2xl">
            
            {/* Browser Header */}
            <div className="absolute top-0 left-0 right-0 h-10 border-b border-pm-border bg-pm-surface-2 flex items-center px-4 justify-between z-20">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
              
              <div className="px-4 py-1 bg-pm-bg border border-pm-border rounded-md text-[10px] font-mono text-pm-muted w-1/2 text-center select-none truncate">
                {isLoading ? 'Loading sandbox...' : currentUrl}
              </div>
              
              <div className="w-8 flex justify-end">
                <span className="w-2 h-2 rounded-full bg-pm-cyan animate-pulse" />
              </div>
            </div>

            {/* Click Interceptor Wrapper */}
            <div 
              onClick={() => setShowConversion(true)}
              className="absolute inset-0 pt-10 bg-pm-bg font-sans z-0 select-none overflow-hidden cursor-pointer"
            >
              {/* Scanlines / CRT effect */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none" />

              <AnimatePresence mode="wait">
                {isLoading ? (
                  // Loading Simulation State
                  <motion.div
                    key="loading-box"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-pm-bg"
                  >
                    <RefreshCw className="w-8 h-8 text-pm-accent-bright animate-spin" />
                    <span className="font-mono text-xs text-pm-muted">{loadingText}</span>
                  </motion.div>
                ) : (
                  // Website Content State based on hovered System Category
                  <motion.div
                    key={activeSystem}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full h-full p-8 flex flex-col justify-start items-center relative"
                  >
                    {/* Render Category specific mock content */}
                    {activeSystem === 'dom' && (
                      <div className="text-center mt-12 space-y-4 max-w-sm">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent-vivid bg-pm-accent/10 px-2.5 py-0.5 rounded-full border border-pm-accent/20">
                          Entrext Sandbox
                        </span>
                        <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-tight">
                          We Build the Future of <br />Collaboration Layers.
                        </h2>
                        <p className="text-[10px] text-pm-muted leading-relaxed">
                          From automated sandboxes to precision DOM debugging tools, we turn complex workflows into friction-free user experiences.
                        </p>
                        <button className="px-5 py-2.5 bg-pm-accent text-white text-[10px] font-bold uppercase tracking-wider rounded-lg pointer-events-none">
                          LAUNCH SANDBOX
                        </button>

                        {/* Interactive marker representation */}
                        <div className="absolute left-[58%] top-[66%] -translate-x-1/2 -translate-y-1/2">
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-pm-accent/40 animate-ping opacity-75" />
                            <div className="w-4 h-4 rounded-full bg-pm-accent border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                              1
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSystem === 'threejs' && (
                      <div className="text-center mt-8 space-y-4 w-full h-full flex flex-col items-center">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-pm-cyan bg-pm-cyan/10 px-2.5 py-0.5 rounded-full border border-pm-cyan/20">
                          Three.js Raycasting Node
                        </span>
                        
                        {/* Interactive Spinning wireframe cube */}
                        <div className="w-24 h-24 relative mt-4 flex items-center justify-center">
                          <motion.div
                            animate={{ rotateX: 360, rotateY: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 border-2 border-dashed border-pm-cyan/50 rounded-xl relative"
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-pm-cyan">
                            [3D Mesh]
                          </div>
                        </div>

                        <p className="text-[10px] text-pm-muted max-w-xs leading-normal">
                          Raycast coordinates resolved on exact face index and vertex offsets of 3D objects.
                        </p>

                        {/* Dynamic pin placed directly on the spinning mesh */}
                        <div className="absolute left-[50%] top-[40%]">
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-pm-cyan/40 animate-ping opacity-75" />
                            <div className="w-4 h-4 rounded-full bg-pm-cyan border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                              2
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSystem === 'webgl' && (
                      <div className="text-center mt-8 space-y-4 w-full h-full flex flex-col items-center">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-pm-cyan bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                          WebGL Shader Canvas
                        </span>
                        
                        {/* Animated Wave Shader representation */}
                        <div className="w-full max-w-xs h-20 bg-pm-surface-2 rounded-xl border border-pm-border overflow-hidden relative mt-4">
                          <motion.div
                            animate={{ x: ['-20%', '0%', '-20%'] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-pm-accent/20 to-pm-cyan/20 bg-[size:200%_100%]"
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-pm-muted">
                            [Drawing Buffer Synced]
                          </div>
                        </div>

                        <p className="text-[10px] text-pm-muted leading-normal">
                          Custom canvas drawing buffer extraction captures dynamic shader scenes.
                        </p>

                        <div className="absolute left-[40%] top-[45%]">
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500/40 animate-ping opacity-75" />
                            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                              3
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSystem === 'spa' && (
                      <div className="text-center mt-6 space-y-4 w-full">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                          Next.js SPA Transition
                        </span>
                        
                        <div className="w-full max-w-sm bg-pm-surface-2 border border-pm-border rounded-xl p-3 text-left space-y-2 mt-4">
                          <div className="flex justify-between items-center text-[8px] border-b border-pm-border/30 pb-1.5 text-pm-muted">
                            <span>ROUTE: /explore</span>
                            <span className="text-teal-400 font-bold">CLIENT RENDERED</span>
                          </div>
                          <div className="h-2 w-1/3 bg-pm-surface-3 rounded" />
                          <div className="h-2 w-full bg-pm-surface-3 rounded" />
                          <div className="h-2 w-2/3 bg-pm-surface-3 rounded" />
                        </div>

                        <div className="absolute left-[70%] top-[45%]">
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-teal-500/40 animate-ping opacity-75" />
                            <div className="w-4 h-4 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                              4
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSystem === 'shadowdom' && (
                      <div className="text-center mt-6 space-y-4 w-full">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20">
                          Traversing Shadow DOM Tree
                        </span>
                        
                        <div className="w-full max-w-sm bg-pm-surface-2 border border-pm-border rounded-xl p-3 text-left font-mono text-[8px] space-y-1 mt-4 text-pm-muted">
                          <div><span className="text-white">{"<pixelmark-audit-overlay>"}</span></div>
                          <div className="pl-3 text-fuchsia-400">{"#shadow-root (open)"}</div>
                          <div className="pl-6">{"<style>..."}</div>
                          <div className="pl-6 text-white">{"<div.feedback-pin-container>"}</div>
                          <div className="pl-9 text-pm-accent-vivid">{"<button.marker-pin>"} <span className="text-pm-muted">{"[Clicked]"}</span></div>
                        </div>

                        <div className="absolute left-[60%] top-[55%]">
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-500/40 animate-ping opacity-75" />
                            <div className="w-4 h-4 rounded-full bg-fuchsia-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                              5
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Conversion Overlay (Interception Prompter) */}
            <AnimatePresence>
              {showConversion && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-pm-bg/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center space-y-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent-vivid">
                    <Zap className="w-6 h-6" />
                  </div>
                  
                  <div className="space-y-2 max-w-sm">
                    <h3 className="font-display text-xl font-bold text-white tracking-tight leading-tight">
                      Why don't you try the product for free with this?
                    </h3>
                    <p className="text-xs text-pm-muted leading-relaxed">
                      Initialize your sandbox, invite reviewers, and map precision DOM annotations in seconds.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Link
                      href="/auth/register"
                      className="px-5 py-2.5 bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-accent transition-colors"
                    >
                      Start Free Redesign
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConversion(false);
                      }}
                      className="px-5 py-2.5 bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-text border border-pm-border text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Watermark */}
            <div className="absolute bottom-2 left-4 font-mono text-[8px] text-pm-muted/20 pointer-events-none select-none">
              [PixelMark Engine: playground state active]
            </div>
          </div>
        </div>

        {/* Lower Layout: 5 Interactive System Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-8 border-t border-pm-border/30">
          {systems.map((sys) => {
            const isActive = activeSystem === sys.id;
            return (
              <div
                key={sys.id}
                onMouseEnter={() => {
                  if (!isLoading) setActiveSystem(sys.id);
                }}
                className={`p-5 rounded-xl border border-pm-border bg-pm-surface/30 text-left transition-all duration-300 cursor-pointer ${sys.border} ${isActive ? `${sys.glow} border-pm-accent-bright/40 bg-pm-surface-2/40` : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg ${sys.accentBg} flex items-center justify-center ${sys.color}`}>
                    <sys.icon className="w-4 h-4" />
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pm-accent-bright" />
                  )}
                </div>
                <h4 className="font-display text-xs font-bold text-white mb-1.5 uppercase tracking-wide">
                  {sys.name}
                </h4>
                <p className="text-[10px] text-pm-muted leading-relaxed font-sans">
                  {sys.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
