'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, MousePointer2, Search, RefreshCw, Globe, Box, Grid, Compass, HelpCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type SystemCategory = 'dom' | 'threejs' | 'webgl' | 'spa';

interface MockPin {
  id: number;
  x: number;
  y: number;
  element: string;
  selector: string;
  width: string;
  height: string;
  display: string;
}

export default function HeroSection() {
  const [activeSystem, setActiveSystem] = useState<SystemCategory>('dom');
  const [urlInput, setUrlInput] = useState('https://entrext.com');
  const [currentUrl, setCurrentUrl] = useState('https://entrext.com');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showConversion, setShowConversion] = useState(false);
  
  // Interactive guided demo states
  const [activePin, setActivePin] = useState<MockPin | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-hover/click simulation on initial load to guide user
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate hover
      setHoveredElement('button');
      
      // Simulate click after 1.5s
      const clickTimer = setTimeout(() => {
        setHoveredElement(null);
        setActivePin({
          id: 1,
          x: 60, // percentage x
          y: 65, // percentage y
          element: '<button#demo-cta-btn>',
          selector: 'html > body > main > div > button.btn-cta',
          width: '160px',
          height: '40px',
          display: 'inline-block'
        });
        setDrawerOpen(true);
      }, 1500);

      return () => clearTimeout(clickTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Run the loading simulation when a URL is submitted
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setShowConversion(false);
    setDrawerOpen(false);
    setActivePin(null);
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
      // Reset to DOM mode
      setActiveSystem('dom');
    }, 1500);
  };

  // Click handler on mock elements to drop a pin
  const handleElementClick = (elementName: string, selector: string, width: string, height: string, display: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || showConversion) return;

    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;

      setActivePin({
        id: Date.now(),
        x: clickX,
        y: clickY,
        element: elementName,
        selector: selector,
        width: width,
        height: height,
        display: display
      });
      setDrawerOpen(true);
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
      color: 'text-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      border: 'hover:border-amber-500/30',
      accentBg: 'bg-amber-500/10',
      description: 'Drawing buffer snapshots with custom CORS support.'
    },
    {
      id: 'spa' as SystemCategory,
      name: 'SPA Router',
      icon: Compass,
      color: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]',
      border: 'hover:border-emerald-500/30',
      accentBg: 'bg-emerald-500/10',
      description: 'Hydrates router viewports dynamically without reloads.'
    }
  ];

  // Steps details for onboarding
  const onboardingSteps = [
    { num: '1', title: 'Open a site', desc: 'Paste a URL to generate a review link' },
    { num: '2', title: 'Click any element', desc: 'Drop a pin to capture element context' },
    { num: '3', title: 'Add feedback', desc: 'Write notes and set workflow states' },
    { num: '4', title: 'Share session', desc: 'Send link to devs with zero extension walls' }
  ];

  return (
    <section className="relative min-h-screen pt-[72px] pb-16 flex flex-col justify-center overflow-hidden bg-pm-bg dot-grid">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.12),transparent_65%)]" />
        <div className="absolute top-0 right-0 w-[45%] h-[45%] bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.08),transparent_55%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex-1 flex flex-col justify-center gap-12 relative z-10">
        
        {/* Upper Layout: Text content + Interactive Guided Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column (Content & Onboarding guidance) */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left space-y-6">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-pm-accent-subtle border border-pm-border-bright text-pm-accent-vivid text-[10px] font-bold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 fill-pm-accent-vivid/20" />
              <span>⚡ Guided Sandbox Walkthrough</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              Precision feedback. <br />
              <span className="text-gradient-purple font-black">Direct on the DOM.</span>
            </h1>

            <p className="text-xs md:text-sm text-pm-muted leading-relaxed max-w-lg">
              Experience the product: click any element in the mockup browser to drop a pin, capture selectors, and slide open the feedback drawer automatically.
            </p>

            {/* URL Interactive Input */}
            <form
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
            </form>

            {/* Micro Onboarding Copy */}
            <div className="space-y-2 max-w-md p-3 rounded-lg border border-pm-border bg-pm-surface/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-pm-accent-vivid flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Interactive Hint</span>
              </div>
              <p className="text-[10px] text-pm-muted leading-normal">
                Click elements inside the mockup site (like the hero heading, logo, or CTA button) to see how the DOM capture engine isolates computed CSS styles and selectors in real-time.
              </p>
            </div>

            <div className="flex gap-4">
              <Link
                href="/auth/register"
                className="px-6 py-3 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-accent hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Start Redesigning Feedback
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column (Guided Demo browser) */}
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

            {/* Sandbox Workspace / Webpage Area */}
            <div 
              ref={previewRef}
              onClick={(e) => {
                // Clicking anywhere else on standard DOM drops a default pin
                if (activeSystem === 'dom') {
                  handleElementClick('<div.container>', 'html > body > main > div.container', '960px', '400px', 'block', e);
                }
              }}
              className="absolute inset-0 pt-10 bg-pm-bg font-sans z-0 select-none overflow-hidden cursor-pointer"
            >
              {/* Scanlines / CRT filter effect */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none" />

              <AnimatePresence mode="wait">
                {isLoading ? (
                  // Loading State
                  <motion.div
                    key="loading-sandbox"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-pm-bg"
                  >
                    <RefreshCw className="w-8 h-8 text-pm-accent-bright animate-spin" />
                    <span className="font-mono text-xs text-pm-muted">{loadingText}</span>
                  </motion.div>
                ) : (
                  // Webpage mock content based on active System Category
                  <motion.div
                    key={activeSystem}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full h-full p-8 flex flex-col justify-start items-center relative"
                  >
                    {/* DOM / Entrext Website Preview */}
                    {activeSystem === 'dom' && (
                      <div className="text-center mt-12 space-y-4 max-w-sm w-full">
                        {/* Header bar items clickable */}
                        <div className="absolute top-10 left-0 right-0 px-8 flex justify-between items-center py-3 border-b border-pm-border/20 z-10 bg-pm-bg/40">
                          <span 
                            onClick={(e) => handleElementClick('<a.logo>', 'html > body > header > a.logo', '120px', '24px', 'flex', e)}
                            className="font-display text-xs font-bold text-pm-text hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2"
                          >
                            Entrext
                          </span>
                          <span className="text-[8px] text-pm-text-muted">A Entrext Labs Product</span>
                        </div>

                        <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent-vivid bg-pm-accent/10 px-2.5 py-0.5 rounded-full border border-pm-accent/20">
                          Entrext Sandbox
                        </span>
                        
                        <h2 
                          onClick={(e) => handleElementClick('<h2.heading-main>', 'html > body > main > h2.heading-main', '384px', '64px', 'block', e)}
                          className={`text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-tight hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 ${hoveredElement === 'heading' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2' : ''}`}
                        >
                          Engineering the <br />Next-Gen Web.
                        </h2>
                        
                        <p className="text-[10px] text-pm-muted leading-relaxed">
                          From automated sandboxes to precision DOM debugging tools, we turn complex workflows into friction-free user experiences.
                        </p>
                        
                        <button 
                          onClick={(e) => handleElementClick('<button#demo-cta-btn>', 'html > body > main > div > button.btn-cta', '160px', '40px', 'inline-block', e)}
                          className={`px-5 py-2.5 bg-pm-accent text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 ${hoveredElement === 'button' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2' : ''}`}
                        >
                          LAUNCH SANDBOX
                        </button>
                      </div>
                    )}

                    {/* Three.js 3D Preview */}
                    {activeSystem === 'threejs' && (
                      <div className="text-center mt-8 space-y-4 w-full h-full flex flex-col items-center">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-pm-cyan bg-pm-cyan/10 px-2.5 py-0.5 rounded-full border border-pm-cyan/20">
                          Three.js Raycasting Scene
                        </span>
                        
                        <div 
                          onClick={(e) => handleElementClick('<canvas#threejs-canvas>', 'html > body > main > canvas#threejs-canvas', '400px', '220px', 'block', e)}
                          className="w-24 h-24 relative mt-4 flex items-center justify-center border border-dashed border-pm-cyan/20 hover:border-pm-cyan/60 rounded-xl"
                        >
                          <motion.div
                            animate={{ rotateX: 360, rotateY: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            className="w-12 h-12 border-2 border-pm-cyan/50 rounded-lg"
                          />
                        </div>
                        <p className="text-[10px] text-pm-muted max-w-xs leading-normal">
                          Clicking the canvas raycasts 3D coordinates on faces and mesh indexes automatically.
                        </p>
                      </div>
                    )}

                    {/* WebGL Preview */}
                    {activeSystem === 'webgl' && (
                      <div className="text-center mt-8 space-y-4 w-full h-full flex flex-col items-center">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          WebGL Shader Substrate
                        </span>
                        
                        <div 
                          onClick={(e) => handleElementClick('<canvas#shader-canvas>', 'html > body > main > canvas#shader-canvas', '400px', '220px', 'block', e)}
                          className="w-full max-w-xs h-20 bg-pm-surface-2 rounded-xl border border-pm-border hover:border-amber-500/40 overflow-hidden relative mt-4"
                        >
                          <motion.div
                            animate={{ x: ['-20%', '0%', '-20%'] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-pm-accent/10 to-pm-cyan/10 bg-[size:200%_100%]"
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-pm-muted">
                            [Click Shader Canvas]
                          </div>
                        </div>
                        <p className="text-[10px] text-pm-muted leading-normal">
                          Extracts full drawing buffers to capture complex shader rendering context.
                        </p>
                      </div>
                    )}

                    {/* SPA Preview */}
                    {activeSystem === 'spa' && (
                      <div className="text-center mt-6 space-y-4 w-full">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          Next.js SPA Transition
                        </span>
                        
                        <div 
                          onClick={(e) => handleElementClick('<div.card-feed>', 'html > body > main > div.card-feed', '384px', '120px', 'block', e)}
                          className="w-full max-w-sm bg-pm-surface-2 border border-pm-border hover:border-emerald-500/40 rounded-xl p-3 text-left space-y-2 mt-4"
                        >
                          <div className="flex justify-between items-center text-[8px] border-b border-pm-border/30 pb-1.5 text-pm-muted">
                            <span>ROUTE: /explore</span>
                            <span className="text-emerald-400 font-bold">CLIENT RENDERED</span>
                          </div>
                          <div className="h-2 w-1/3 bg-pm-surface-3 rounded" />
                          <div className="h-2 w-full bg-pm-surface-3 rounded" />
                        </div>
                      </div>
                    )}

                    {/* Feedback Pins Layer */}
                    <AnimatePresence>
                      {activePin && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${activePin.x}%`, top: `${activePin.y}%` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerOpen(true);
                          }}
                        >
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-pm-accent/40 animate-ping opacity-75" />
                            <div className="w-4 h-4 rounded-full bg-pm-accent border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg">
                              1
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sliding Mock Feedback Drawer Preview */}
            <AnimatePresence>
              {drawerOpen && activePin && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                  className="absolute right-0 top-10 bottom-0 w-[240px] bg-pm-surface-2 border-l border-pm-border z-10 p-4 font-mono text-[9px] text-pm-text flex flex-col justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-pm-border pb-2">
                      <span className="font-display font-bold text-[10px] text-white">LEAVE FEEDBACK</span>
                      <span className="px-1.5 py-0.5 rounded bg-pm-accent/20 text-pm-accent-vivid text-[8px] font-bold">DRAFT</span>
                    </div>

                    {/* Screenshot thumbnail mockup */}
                    <div className="bg-pm-bg rounded border border-pm-border p-1 text-center">
                      <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Screenshot Evidence</div>
                      <div className="h-16 bg-pm-surface-3 rounded border border-pm-border flex items-center justify-center text-[8px] text-pm-muted">
                        [Element Screenshot Captured]
                      </div>
                    </div>

                    {/* Target element selector path */}
                    <div className="space-y-1">
                      <span className="text-pm-cyan font-bold block mb-1">
                        {activePin.element}
                      </span>
                      <span className="text-pm-muted text-[8px] block break-all">
                        {activePin.selector}
                      </span>
                    </div>

                    {/* Computed styles list */}
                    <div className="bg-pm-bg p-2 rounded border border-pm-border space-y-1">
                      <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Computed CSS</div>
                      <div className="flex justify-between">
                        <span>Display:</span>
                        <span className="text-white">{activePin.display}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Width:</span>
                        <span className="text-white">{activePin.width}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Height:</span>
                        <span className="text-white">{activePin.height}</span>
                      </div>
                    </div>

                    {/* Mock feedback form values */}
                    <div className="space-y-2">
                      <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold">Feedback Comments</div>
                      <div className="bg-pm-bg p-2 rounded border border-pm-border">
                        <textarea 
                          placeholder="Type notes for developers..."
                          className="bg-transparent border-none outline-none text-[8.5px] text-pm-text w-full h-10 resize-none font-sans placeholder:text-pm-text-faint"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-pm-bg p-1 rounded border border-pm-border text-center">
                          <span className="text-[7.5px] text-pm-accent-vivid">LAYOUT</span>
                        </div>
                        <div className="flex-1 bg-pm-bg p-1 rounded border border-pm-border text-center">
                          <span className="text-[7.5px] text-red-400">HIGH</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-pm-border space-y-2">
                    <button 
                      onClick={() => setShowConversion(true)}
                      className="w-full py-2 rounded bg-pm-accent hover:bg-pm-accent-bright text-white text-center font-bold text-[8.5px] uppercase tracking-wider shadow-accent"
                    >
                      Submit feedback pin
                    </button>
                    <div className="text-[7.5px] text-pm-muted/50 text-center italic">
                      This is what your reviewer sees.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversion Overlay (Interception Prompter) */}
            <AnimatePresence>
              {showConversion && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-pm-bg/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center space-y-6"
                  onClick={(e) => e.stopPropagation()}
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
              [PixelMark Engine: sandbox state active]
            </div>
          </div>
        </div>

        {/* Horizontal Walkthrough Workflow Strip */}
        <div className="py-6 border-t border-b border-pm-border/30 w-full grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          {onboardingSteps.map((step) => (
            <div key={step.num} className="flex gap-3 items-start p-2">
              <span className="w-5 h-5 rounded bg-pm-accent/20 border border-pm-accent/30 flex items-center justify-center font-display text-[10px] font-bold text-pm-accent-vivid flex-shrink-0 mt-0.5">
                {step.num}
              </span>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{step.title}</h4>
                <p className="text-[9px] text-pm-muted leading-normal">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lower Layout: 4 Interactive System Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {systems.map((sys) => {
            const isActive = activeSystem === sys.id;
            return (
              <div
                key={sys.id}
                onMouseEnter={() => {
                  if (!isLoading) {
                    setActiveSystem(sys.id);
                    setDrawerOpen(false);
                    setActivePin(null);
                  }
                }}
                className={`p-5 rounded-xl border border-pm-border bg-pm-surface/30 text-left transition-all duration-300 cursor-pointer ${sys.border} ${isActive ? `${sys.glow} border-pm-accent-bright/40 bg-pm-surface-2/40` : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg ${sys.accentBg} flex items-center justify-center ${sys.color}`}>
                    <sys.icon className="w-4 h-4" />
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pm-accent-bright animate-pulse" />
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
