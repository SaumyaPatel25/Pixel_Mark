'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, MousePointer2, Search, RefreshCw, Globe, Box, Grid, Compass, HelpCircle, CheckCircle2, Layers, Info } from 'lucide-react';
import Link from 'next/link';
import { ModeType } from '@/app/page';

interface MockPin {
  id: number;
  x: number;
  y: number;
  element: string;
  selector: string;
  width?: string;
  height?: string;
  display?: string;
  xpath?: string;
  meshName?: string;
  geometry?: string;
  material?: string;
  raycastCoords?: string;
  faceIndex?: number;
  webglContext?: string;
  gpuVendor?: string;
  gpuRenderer?: string;
  canvasX?: number;
  canvasY?: number;
  activeRoute?: string;
  routeHistory?: string[];
  routeLoadTime?: string;
  performanceMetrics?: { fid: string; lcp: string };
  shadowHost?: string;
  shadowMode?: string;
  composedPath?: string;
}

interface HeroSectionProps {
  activeMode: ModeType;
  setActiveMode: (mode: ModeType) => void;
}

export default function HeroSection({ activeMode, setActiveMode }: HeroSectionProps) {
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

  // Local state for SPA mode simulated route
  const [spaTab, setSpaTab] = useState<'home' | 'explore' | 'settings'>('explore');

  // Trigger automated guided demo tour when activeMode changes
  useEffect(() => {
    setActivePin(null);
    setDrawerOpen(false);
    setHoveredElement(null);
    setShowConversion(false);

    let hoverTarget = '';
    let pinData: MockPin | null = null;

    switch (activeMode) {
      case 'dom':
        hoverTarget = 'button';
        pinData = {
          id: 1,
          x: 60,
          y: 65,
          element: '<button#demo-cta-btn>',
          selector: 'html > body > main > div > button.btn-cta',
          xpath: '/html/body/main/div/button',
          width: '160px',
          height: '40px',
          display: 'inline-block'
        };
        break;
      case 'threejs':
        hoverTarget = '3d-cube';
        pinData = {
          id: 2,
          x: 50,
          y: 45,
          element: 'Mesh#cube-01',
          selector: 'html > body > main > canvas#threejs-canvas',
          meshName: 'Mesh#cube-01',
          geometry: 'BoxGeometry(4, 4, 4)',
          material: 'MeshStandardMaterial',
          raycastCoords: '[1.45, -0.89, 0.12]',
          faceIndex: 4
        };
        break;
      case 'webgl':
        hoverTarget = 'shader-canvas';
        pinData = {
          id: 3,
          x: 55,
          y: 50,
          element: 'canvas#shader-canvas',
          selector: 'html > body > main > canvas#shader-canvas',
          webglContext: 'webgl2',
          gpuVendor: 'Google Inc. (NVIDIA)',
          gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)',
          canvasX: 231,
          canvasY: 184
        };
        break;
      case 'spa':
        hoverTarget = 'spa-card';
        pinData = {
          id: 4,
          x: 45,
          y: 58,
          element: 'div.card-feed',
          selector: 'html > body > main > div.card-feed',
          activeRoute: '/explore',
          routeHistory: ['/', '/explore'],
          routeLoadTime: '42ms',
          performanceMetrics: { fid: '8ms', lcp: '240ms' }
        };
        break;
      case 'shadow-dom':
        hoverTarget = 'nested-button';
        pinData = {
          id: 5,
          x: 52,
          y: 60,
          element: 'button.btn-like',
          selector: 'button.btn-like',
          shadowHost: '<custom-card>',
          shadowMode: 'open',
          composedPath: 'custom-card => shadow-root => div.footer > button.btn-like'
        };
        break;
    }

    const hoverTimer = setTimeout(() => {
      setHoveredElement(hoverTarget);
    }, 500);

    const clickTimer = setTimeout(() => {
      setHoveredElement(null);
      setActivePin(pinData);
      setDrawerOpen(true);
    }, 1300);

    return () => {
      clearTimeout(hoverTimer);
      clearTimeout(clickTimer);
    };
  }, [activeMode]);

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
      setActiveMode('dom');
    }, 1500);
  };

  // Click handler on mock elements to drop a pin
  const handleElementClick = (
    elementName: string,
    selector: string,
    width?: string,
    height?: string,
    display?: string,
    e?: React.MouseEvent,
    customProps?: Partial<MockPin>
  ) => {
    if (e) e.stopPropagation();
    if (isLoading || showConversion) return;

    if (previewRef.current) {
      let clickX = 50;
      let clickY = 50;
      if (e) {
        const rect = previewRef.current.getBoundingClientRect();
        clickX = ((e.clientX - rect.left) / rect.width) * 100;
        clickY = ((e.clientY - rect.top) / rect.height) * 100;
      }

      setActivePin({
        id: Date.now(),
        x: clickX,
        y: clickY,
        element: elementName,
        selector: selector,
        width: width || 'auto',
        height: height || 'auto',
        display: display || 'block',
        ...customProps
      });
      setDrawerOpen(true);
    }
  };

  // Systems details matching 5 modes
  const systems = [
    {
      id: 'dom' as ModeType,
      name: 'Standard DOM',
      icon: Globe,
      color: 'text-purple-400',
      glow: 'shadow-[0_0_20px_rgba(124,58,237,0.15)]',
      border: 'hover:border-purple-500/30',
      accentBg: 'bg-purple-500/10',
      description: 'Resolves CSS selectors, computed styles & absolute XPaths.'
    },
    {
      id: 'threejs' as ModeType,
      name: 'Three.js 3D',
      icon: Box,
      color: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      border: 'hover:border-cyan-500/30',
      accentBg: 'bg-cyan-500/10',
      description: 'Native 3D raycasting pins comments directly on meshes.'
    },
    {
      id: 'webgl' as ModeType,
      name: 'WebGL Shader',
      icon: Grid,
      color: 'text-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      border: 'hover:border-amber-500/30',
      accentBg: 'bg-amber-500/10',
      description: 'Drawing buffer snapshots with custom CORS support.'
    },
    {
      id: 'spa' as ModeType,
      name: 'SPA Router',
      icon: Compass,
      color: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]',
      border: 'hover:border-emerald-500/30',
      accentBg: 'bg-emerald-500/10',
      description: 'Hydrates router viewports dynamically without reloads.'
    },
    {
      id: 'shadow-dom' as ModeType,
      name: 'Shadow DOM',
      icon: Layers,
      color: 'text-fuchsia-400',
      glow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)]',
      border: 'hover:border-fuchsia-500/30',
      accentBg: 'bg-fuchsia-500/10',
      description: 'Traverses encapsulated shadow trees to pinpoint nested nodes.'
    }
  ];

  const onboardingSteps = [
    { num: '1', title: 'Open a site', desc: 'Paste a URL to generate a review link' },
    { num: '2', title: 'Click any element', desc: 'Drop a pin to capture element context' },
    { num: '3', title: 'Add feedback', desc: 'Write notes and set workflow states' },
    { num: '4', title: 'Share session', desc: 'Send link to devs with zero extension walls' }
  ];

  // Mode-specific descriptive copy
  const modeExplainer = {
    dom: {
      hint: 'Click elements inside the mockup site (like the hero heading, logo, or CTA button) to see how the DOM capture engine isolates computed CSS styles and selectors in real-time.',
      label: 'DOM Lens Sandbox',
      color: 'text-pm-accent-vivid border-pm-accent/20 bg-pm-accent/10',
    },
    threejs: {
      hint: 'Click anywhere on the spinning 3D cube model. The Three.js raycaster captures absolute 3D mesh vectors, face indices, and active geometry data automatically.',
      label: 'Three.js 3D Raycaster',
      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
    },
    webgl: {
      hint: 'Click the animated WebGL shader substrate canvas. The renderer engine isolates the raw drawing buffer, recording WebGL context attributes and GPU specifications.',
      label: 'WebGL Canvas Buffer',
      color: 'text-amber-500 border-amber-500/20 bg-amber-500/10',
    },
    spa: {
      hint: 'Navigate client-side using the tab routing bar (/index, /explore, /settings). Place comments inside each sub-view to verify pins filter reactively based on active routes.',
      label: 'SPA Router Sandbox',
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    },
    'shadow-dom': {
      hint: 'Click inside custom component interfaces. The traversal engine follows the composed path inside #shadow-roots to record elements hidden from standard selectors.',
      label: 'Shadow DOM Traverser',
      color: 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/10',
    },
  };

  return (
    <section className="relative min-h-screen pt-[88px] pb-16 flex flex-col justify-center overflow-hidden bg-pm-bg dot-grid">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_bottom_left,var(--pm-accent-subtle),transparent_65%)] transition-all duration-500" />
        <div className="absolute top-0 right-0 w-[45%] h-[45%] bg-[radial-gradient(circle_at_top_right,var(--pm-accent-subtle),transparent_55%)] transition-all duration-500" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex-1 flex flex-col justify-center gap-10 relative z-10">
        
        {/* Upper Layout: Hero Copy + Interactive Sandbox Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: SaaS Pitching copy */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left space-y-6">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-pm-accent-subtle border border-pm-border-bright text-pm-accent-vivid text-[10px] font-bold uppercase tracking-widest transition-colors duration-500">
              <Zap className="w-3.5 h-3.5 fill-pm-accent-vivid/20" />
              <span>⚡ Renderer-Aware Sandbox Stage</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6.5xl font-bold tracking-tight text-white leading-[1.05] transition-all duration-500">
              Visual reviews. <br />
              <span className="text-gradient-purple font-black">For every web stack.</span>
            </h1>

            <p className="text-xs md:text-sm text-pm-muted leading-relaxed max-w-lg font-sans">
              No extensions. No reviewer accounts. Click any element inside the interactive preview to drop a precision pin and capture screenshots, CSS styles, 3D meshes, and router logs instantly.
            </p>

            {/* URL Interactive Input */}
            <form
              onSubmit={handleUrlSubmit}
              className="flex items-center gap-2 max-w-md w-full bg-pm-surface/60 border border-pm-border p-1.5 rounded-xl focus-within:border-pm-accent/50 transition-all duration-300"
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
                className="px-4 py-2 bg-pm-accent hover:bg-pm-accent-bright disabled:bg-pm-surface-3 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-accent"
              >
                {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load'}
              </button>
            </form>

            {/* Micro Onboarding Copy */}
            <div className="space-y-2 max-w-md p-3.5 rounded-xl border border-pm-border bg-pm-surface/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-pm-accent-vivid flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Try the Live Demo</span>
              </div>
              <p className="text-[10px] text-pm-muted leading-normal font-sans">
                {modeExplainer[activeMode].hint}
              </p>
            </div>

            <div className="flex gap-4 pt-1">
              <Link
                href="/auth/register"
                className="px-6 py-3 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-accent hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Start Redesigning Feedback
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Dynamic Mockup Browser & Mode Switcher */}
          <div className="lg:col-span-7 flex flex-col space-y-3 w-full">
            
            {/* Tab Mode Switcher above the preview */}
            <div className="flex items-center gap-1 p-1 bg-pm-surface/40 border border-pm-border rounded-xl self-start max-w-full overflow-x-auto scrollbar-none">
              {(['dom', 'threejs', 'webgl', 'spa', 'shadow-dom'] as ModeType[]).map((mode) => {
                const isSelected = activeMode === mode;
                const label = mode === 'dom' ? 'DOM' : mode === 'threejs' ? 'Three.js' : mode === 'webgl' ? 'WebGL' : mode === 'spa' ? 'SPA' : 'Shadow DOM';
                return (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${isSelected ? 'bg-pm-accent text-white shadow-accent font-black' : 'text-pm-muted hover:text-white hover:bg-pm-surface-2/50'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Mockup Browser Container */}
            <div className="relative w-full aspect-[4/3] rounded-2xl border border-pm-border bg-pm-surface/40 overflow-hidden shadow-2xl">
              
              {/* Browser Header Bar */}
              <div className="absolute top-0 left-0 right-0 h-10 border-b border-pm-border bg-pm-surface-2 flex items-center px-4 justify-between z-20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                </div>
                
                <div className="px-4 py-1 bg-pm-bg border border-pm-border rounded-md text-[10px] font-mono text-pm-muted w-1/2 text-center select-none truncate">
                  {isLoading ? 'Connecting Sandbox...' : activeMode === 'spa' ? `${currentUrl}${spaTab === 'explore' ? '/explore' : spaTab === 'settings' ? '/settings' : ''}` : currentUrl}
                </div>
                
                <div className="w-8 flex justify-end">
                  <span className="w-2 h-2 rounded-full bg-pm-accent animate-pulse" />
                </div>
              </div>

              {/* Sandbox Workspace / Webpage Area */}
              <div 
                ref={previewRef}
                onClick={(e) => {
                  // Fallback clicking inside the preview area
                  if (activeMode === 'dom') {
                    handleElementClick('<div.container>', 'html > body > main > div.container', '960px', '400px', 'block', e, {
                      xpath: '/html/body/main/div'
                    });
                  } else if (activeMode === 'threejs') {
                    handleElementClick('Mesh#sphere-02', 'html > body > main > canvas#threejs-canvas', '400px', '220px', 'block', e, {
                      meshName: 'Mesh#sphere-02',
                      geometry: 'SphereGeometry(2, 32, 32)',
                      material: 'MeshPhongMaterial',
                      raycastCoords: '[0.54, 1.12, -0.98]',
                      faceIndex: 12
                    });
                  } else if (activeMode === 'webgl') {
                    const rect = previewRef.current?.getBoundingClientRect();
                    const cx = rect ? Math.round(e.clientX - rect.left) : 120;
                    const cy = rect ? Math.round(e.clientY - rect.top) : 90;
                    handleElementClick('canvas#shader-canvas', 'html > body > main > canvas#shader-canvas', '400px', '220px', 'block', e, {
                      webglContext: 'webgl2',
                      gpuVendor: 'Google Inc. (NVIDIA)',
                      gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)',
                      canvasX: cx,
                      canvasY: cy
                    });
                  } else if (activeMode === 'spa') {
                    handleElementClick('div.home-card', 'html > body > main > div.home-card', '380px', '90px', 'block', e, {
                      activeRoute: `/${spaTab}`,
                      routeHistory: ['/', `/explore`, `/${spaTab}`],
                      routeLoadTime: '36ms',
                      performanceMetrics: { fid: '7ms', lcp: '210ms' }
                    });
                  } else if (activeMode === 'shadow-dom') {
                    handleElementClick('img.avatar-img', 'img.avatar-img', '40px', '40px', 'block', e, {
                      shadowHost: '<user-avatar>',
                      shadowMode: 'open',
                      composedPath: 'user-avatar => shadow-root => div.container > img.avatar-img'
                    });
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
                    // Webpage mock content based on active Mode
                    <motion.div
                      key={activeMode}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.4 }}
                      className="w-full h-full p-8 flex flex-col justify-start items-center relative"
                    >
                      {/* DOM / Entrext Website Preview */}
                      {activeMode === 'dom' && (
                        <div className="text-center mt-12 space-y-4 max-w-sm w-full">
                          {/* Header bar items clickable */}
                          <div className="absolute top-10 left-0 right-0 px-8 flex justify-between items-center py-3 border-b border-pm-border/20 z-10 bg-pm-bg/40">
                            <span 
                              onClick={(e) => handleElementClick('<a.logo>', 'html > body > header > a.logo', '120px', '24px', 'flex', e, {
                                xpath: '/html/body/header/a'
                              })}
                              className="font-display text-xs font-bold text-pm-text hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2"
                            >
                              Entrext
                            </span>
                            <span className="text-[8px] text-pm-text-muted font-sans">A Entrext Labs Product</span>
                          </div>

                          <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent-vivid bg-pm-accent/10 px-2.5 py-0.5 rounded-full border border-pm-accent/20">
                            Entrext Sandbox
                          </span>
                          
                          <h2 
                            onClick={(e) => handleElementClick('<h2.heading-main>', 'html > body > main > h2.heading-main', '384px', '64px', 'block', e, {
                              xpath: '/html/body/main/h2'
                            })}
                            className={`text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-tight hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 ${hoveredElement === 'heading' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2' : ''}`}
                          >
                            Engineering the <br />Next-Gen Web.
                          </h2>
                          
                          <p className="text-[10px] text-pm-muted leading-relaxed font-sans">
                            From automated sandboxes to precision DOM debugging tools, we turn complex workflows into friction-free user experiences.
                          </p>
                          
                          <button 
                            onClick={(e) => handleElementClick('<button#demo-cta-btn>', 'html > body > main > div > button.btn-cta', '160px', '40px', 'inline-block', e, {
                              xpath: '/html/body/main/div/button'
                            })}
                            className={`px-5 py-2.5 bg-pm-accent text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 ${hoveredElement === 'button' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2' : ''}`}
                          >
                            LAUNCH SANDBOX
                          </button>
                        </div>
                      )}

                      {/* Three.js 3D Preview */}
                      {activeMode === 'threejs' && (
                        <div className="text-center mt-6 space-y-4 w-full h-full flex flex-col items-center justify-center">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent bg-pm-accent-subtle px-2.5 py-0.5 rounded-full border border-pm-border-bright">
                            Three.js Raycasting Scene
                          </span>
                          
                          <div className="w-48 h-48 relative flex items-center justify-center">
                            {/* Outer Ring */}
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                              className="absolute w-36 h-36 border border-dashed border-pm-accent/30 rounded-full"
                            />
                            {/* Inner Orbiting Sphere */}
                            <motion.div
                              animate={{ rotate: -360 }}
                              transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                              className="absolute w-24 h-24 border border-pm-accent/40 rounded-full flex items-center justify-center"
                            >
                              <div className="w-2.5 h-2.5 bg-pm-accent rounded-full absolute -top-1.25" />
                            </motion.div>
                            {/* Center Target Box */}
                            <motion.div
                              onClick={(e) => handleElementClick('Mesh#cube-01', 'html > body > main > canvas#threejs-canvas', '400px', '220px', 'block', e, {
                                meshName: 'Mesh#cube-01',
                                geometry: 'BoxGeometry(4, 4, 4)',
                                material: 'MeshStandardMaterial',
                                raycastCoords: '[1.45, -0.89, 0.12]',
                                faceIndex: 4
                              })}
                              animate={{ rotateX: 360, rotateY: 360 }}
                              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                              className={`w-14 h-14 border-2 border-pm-accent bg-pm-accent/15 rounded-lg flex items-center justify-center hover:bg-pm-accent/25 transition-all ${hoveredElement === '3d-cube' ? 'scale-110 shadow-[0_0_20px_var(--pm-accent-glow)] border-white' : ''}`}
                            >
                              <span className="text-[8px] font-mono text-white">CUBE_01</span>
                            </motion.div>
                          </div>
                          <p className="text-[10px] text-pm-muted max-w-xs leading-normal font-sans">
                            Clicking the mesh raycasts 3D coordinates on geometry faces automatically.
                          </p>
                        </div>
                      )}

                      {/* WebGL Preview */}
                      {activeMode === 'webgl' && (
                        <div className="text-center mt-6 space-y-4 w-full h-full flex flex-col items-center justify-center">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent bg-pm-accent-subtle px-2.5 py-0.5 rounded-full border border-pm-border-bright">
                            WebGL Shader Substrate
                          </span>
                          
                          <div 
                            onClick={(e) => {
                              const rect = previewRef.current?.getBoundingClientRect();
                              const cx = rect ? Math.round(e.clientX - rect.left) : 231;
                              const cy = rect ? Math.round(e.clientY - rect.top) : 184;
                              handleElementClick('canvas#shader-canvas', 'html > body > main > canvas#shader-canvas', '400px', '220px', 'block', e, {
                                webglContext: 'webgl2',
                                gpuVendor: 'Google Inc. (NVIDIA)',
                                gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)',
                                canvasX: cx,
                                canvasY: cy
                              });
                            }}
                            className={`w-full max-w-xs h-28 bg-pm-surface-2 rounded-xl border border-pm-border hover:border-pm-accent-bright/50 overflow-hidden relative ${hoveredElement === 'shader-canvas' ? 'border-pm-accent shadow-[0_0_20px_var(--pm-accent-glow)]' : ''}`}
                          >
                            {/* Shifting Gradient webgl simulation */}
                            <motion.div
                              animate={{
                                background: [
                                  'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                                  'linear-gradient(225deg, rgba(245,158,11,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                                  'linear-gradient(315deg, rgba(245,158,11,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                                  'linear-gradient(45deg, rgba(245,158,11,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                                ]
                              }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                              className="absolute inset-0 bg-[size:200%_200%]"
                            />
                            {/* Scanner sweep line */}
                            <motion.div
                              animate={{ y: ['-10%', '110%'] }}
                              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                              className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-pm-accent to-transparent opacity-60 pointer-events-none"
                            />
                            {/* Pixel grid overlay */}
                            <div className="absolute inset-0 bg-[radial-gradient(var(--pm-accent-subtle)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
                            
                            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-pm-bg/85 border border-pm-border text-[7px] font-mono text-pm-accent-vivid">
                              RENDERER: WEBGL2
                            </div>
                            <div className="absolute bottom-2 right-2 text-[7px] font-mono text-pm-muted">
                              ZOOM: 400%
                            </div>
                          </div>
                          <p className="text-[10px] text-pm-muted leading-normal font-sans">
                            Extracts full drawing buffers to capture shader rendering context context.
                          </p>
                        </div>
                      )}

                      {/* SPA Preview */}
                      {activeMode === 'spa' && (
                        <div className="text-center mt-6 space-y-4 w-full h-full flex flex-col justify-center items-center">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent bg-pm-accent-subtle px-2.5 py-0.5 rounded-full border border-pm-border-bright">
                            Next.js SPA Transition
                          </span>
                          
                          <div className="w-full max-w-sm bg-pm-surface/80 rounded-xl border border-pm-border p-3.5 text-left space-y-3">
                            <div className="flex justify-between items-center text-[8px] border-b border-pm-border/30 pb-2 text-pm-muted">
                              <div className="flex gap-2">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setSpaTab('home'); }}
                                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${spaTab === 'home' ? 'bg-pm-accent/20 text-pm-accent-vivid font-bold' : 'hover:text-white'}`}
                                >
                                  /index
                                </span>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setSpaTab('explore'); }}
                                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${spaTab === 'explore' ? 'bg-pm-accent/20 text-pm-accent-vivid font-bold' : 'hover:text-white'}`}
                                >
                                  /explore
                                </span>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setSpaTab('settings'); }}
                                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${spaTab === 'settings' ? 'bg-pm-accent/20 text-pm-accent-vivid font-bold' : 'hover:text-white'}`}
                                >
                                  /settings
                                </span>
                              </div>
                              <span className="text-pm-accent-vivid font-bold font-mono">App Router</span>
                            </div>

                            <AnimatePresence mode="wait">
                              {spaTab === 'home' && (
                                <motion.div
                                  key="home"
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 6 }}
                                  className="space-y-2"
                                  onClick={(e) => handleElementClick('div.home-card', 'html > body > main > div.home-card', '380px', '90px', 'block', e, {
                                    activeRoute: '/home',
                                    routeHistory: ['/', '/explore', '/home'],
                                    routeLoadTime: '28ms',
                                    performanceMetrics: { fid: '6ms', lcp: '190ms' }
                                  })}
                                >
                                  <h4 className="text-[9px] text-white font-bold font-display">Dashboard Home</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-pm-surface-2 rounded border border-pm-border">
                                      <div className="text-[7px] text-pm-muted">Traffic</div>
                                      <div className="text-xs font-bold text-white">4,812</div>
                                    </div>
                                    <div className="p-2 bg-pm-surface-2 rounded border border-pm-border">
                                      <div className="text-[7px] text-pm-muted">Load Time</div>
                                      <div className="text-xs font-bold text-white">42ms</div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                              {spaTab === 'explore' && (
                                <motion.div
                                  key="explore"
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 6 }}
                                  className="space-y-2"
                                  onClick={(e) => handleElementClick('div.card-feed', 'html > body > main > div.card-feed', '384px', '120px', 'block', e, {
                                    activeRoute: '/explore',
                                    routeHistory: ['/', '/explore'],
                                    routeLoadTime: '42ms',
                                    performanceMetrics: { fid: '8ms', lcp: '240ms' }
                                  })}
                                >
                                  <h4 className="text-[9px] text-white font-bold font-display">Explore Content Feed</h4>
                                  <div className={`p-2.5 rounded-lg bg-pm-surface-2 border border-pm-border space-y-1.5 transition-all ${hoveredElement === 'spa-card' ? 'border-pm-accent shadow-[0_0_15px_var(--pm-accent-glow)]' : ''}`}>
                                    <div className="h-2 w-1/3 bg-pm-surface-3 rounded" />
                                    <div className="h-2 w-full bg-pm-surface-3 rounded" />
                                    <div className="h-2 w-2/3 bg-pm-surface-3 rounded" />
                                  </div>
                                </motion.div>
                              )}
                              {spaTab === 'settings' && (
                                <motion.div
                                  key="settings"
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 6 }}
                                  className="space-y-2"
                                  onClick={(e) => handleElementClick('form.settings-form', 'html > body > main > form.settings', '380px', '100px', 'block', e, {
                                    activeRoute: '/settings',
                                    routeHistory: ['/', '/explore', '/settings'],
                                    routeLoadTime: '32ms',
                                    performanceMetrics: { fid: '6ms', lcp: '200ms' }
                                  })}
                                >
                                  <h4 className="text-[9px] text-white font-bold font-display">Settings Pane</h4>
                                  <div className="flex gap-2 items-center">
                                    <div className="h-6 flex-1 bg-pm-surface-2 rounded border border-pm-border" />
                                    <button className="h-6 px-3 bg-pm-accent rounded text-[8px] font-bold text-white cursor-pointer">SAVE</button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}

                      {/* Shadow DOM Preview */}
                      {activeMode === 'shadow-dom' && (
                        <div className="text-center mt-6 space-y-4 w-full h-full flex flex-col justify-center items-center">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-pm-accent bg-pm-accent-subtle px-2.5 py-0.5 rounded-full border border-pm-border-bright">
                            Shadow DOM Traversal
                          </span>
                          
                          <div className="w-full max-w-sm bg-pm-surface-2/65 border border-pm-border rounded-xl p-4 text-left space-y-3 font-mono">
                            <div className="text-[8px] text-pm-accent-vivid font-bold border-b border-pm-border/30 pb-2">
                              &lt;custom-card class="shadow-host"&gt;
                            </div>
                            
                            <div className="p-3 bg-pm-surface border border-dashed border-pm-accent/30 rounded-lg space-y-2 relative">
                              <span className="absolute -top-2 left-2 bg-pm-surface px-1 text-[7px] text-pm-accent-vivid font-bold">
                                #shadow-root (open)
                              </span>
                              
                              <div className="space-y-1 mt-1">
                                <div className="text-[7px] text-pm-text-faint">&lt;slot name="header"&gt;&lt;/slot&gt;</div>
                                <h4 className="text-[9px] text-white font-bold font-sans">&lt;h3&gt;Encapsulated Node&lt;/h3&gt;</h4>
                              </div>

                              <div className="pt-2 border-t border-pm-border/40 flex justify-between items-center">
                                <span className="text-[7px] text-pm-text-faint">&lt;div class="footer"&gt;</span>
                                <button 
                                  onClick={(e) => handleElementClick('button.btn-like', 'button.btn-like', '80px', '22px', 'inline-block', e, {
                                    shadowHost: '<custom-card>',
                                    shadowMode: 'open',
                                    composedPath: 'custom-card => shadow-root => div.footer > button.btn-like'
                                  })}
                                  className={`px-2 py-1 bg-pm-accent hover:bg-pm-accent-bright text-white rounded text-[7px] font-bold transition-all cursor-pointer ${hoveredElement === 'nested-button' ? 'scale-105 shadow-[0_0_12px_var(--pm-accent-glow)] ring-1 ring-white' : ''}`}
                                >
                                  &lt;button.btn-like&gt;
                                </button>
                              </div>
                            </div>
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
                            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${activePin.x}%`, top: `${activePin.y}%` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerOpen(true);
                            }}
                          >
                            <div className="relative w-7 h-7 flex items-center justify-center cursor-pointer">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-pm-accent/35 animate-ping opacity-75" />
                              <div className="w-4.5 h-4.5 rounded-full bg-pm-accent border-2 border-white flex items-center justify-center text-[8.5px] font-bold text-white shadow-lg">
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
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className="absolute right-0 top-10 bottom-0 w-[240px] bg-pm-surface-2 border-l border-pm-border z-10 p-4 font-mono text-[9px] text-pm-text flex flex-col justify-between backdrop-blur-md bg-pm-surface-2/90"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-4 overflow-y-auto pr-1 select-text scrollbar-thin">
                      <div className="flex items-center justify-between border-b border-pm-border pb-2 animate-fade-in">
                        <span className="font-display font-bold text-[10px] text-white">LEAVE FEEDBACK</span>
                        <span className="px-1.5 py-0.5 rounded bg-pm-accent/20 text-pm-accent-vivid text-[8px] font-bold">DRAFT</span>
                      </div>

                      {/* Screenshot thumbnail mockup */}
                      <div className="bg-pm-bg rounded border border-pm-border p-1 text-center">
                        <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Screenshot Evidence</div>
                        <div className="h-14 bg-pm-surface-3 rounded border border-pm-border flex items-center justify-center text-[7px] text-pm-muted">
                          [Element State Captured]
                        </div>
                      </div>

                      {/* Mode-adaptive drawer fields */}
                      {activeMode === 'dom' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">TARGET ELEMENT</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block break-all">{activePin.element}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">SELECTOR</span>
                            <span className="text-pm-muted text-[8px] block break-all bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.selector}</span>
                          </div>
                          {activePin.xpath && (
                            <div className="space-y-1">
                              <span className="text-pm-accent-vivid font-bold block">XPATH</span>
                              <span className="text-pm-muted text-[8px] block break-all bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.xpath}</span>
                            </div>
                          )}
                          <div className="bg-pm-bg p-2 rounded border border-pm-border space-y-1 animate-fade-in">
                            <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Computed CSS</div>
                            <div className="flex justify-between">
                              <span>Display:</span>
                              <span className="text-white font-sans">{activePin.display}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Width:</span>
                              <span className="text-white font-sans">{activePin.width}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Height:</span>
                              <span className="text-white font-sans">{activePin.height}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMode === 'threejs' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">3D MESH NAME</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block">{activePin.meshName || 'Mesh#unidentified'}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">GEOMETRY</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.geometry || 'BufferGeometry'}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">MATERIAL</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.material || 'MeshBasicMaterial'}</span>
                          </div>
                          <div className="bg-pm-bg p-2 rounded border border-pm-border space-y-1 animate-fade-in">
                            <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Raycast Details</div>
                            <div className="flex justify-between">
                              <span>Face Index:</span>
                              <span className="text-white font-sans">{activePin.faceIndex}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Coordinates:</span>
                              <span className="text-white font-sans">{activePin.raycastCoords}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMode === 'webgl' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">WEBGL CONTEXT</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block">{activePin.webglContext}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">GPU VENDOR</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border break-all">{activePin.gpuVendor}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">RENDERER UNMASKED</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border break-all leading-normal font-sans">{activePin.gpuRenderer}</span>
                          </div>
                          <div className="bg-pm-bg p-2 rounded border border-pm-border flex justify-between animate-fade-in">
                            <span className="text-white/40 uppercase tracking-widest text-[7px] font-bold font-mono">Canvas Point</span>
                            <span className="text-white font-sans">({activePin.canvasX}px, {activePin.canvasY}px)</span>
                          </div>
                        </div>
                      )}

                      {activeMode === 'spa' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">ACTIVE ROUTE</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block">{activePin.activeRoute}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">ROUTE HISTORY</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border font-mono">{activePin.routeHistory?.join(' → ')}</span>
                          </div>
                          <div className="bg-pm-bg p-2 rounded border border-pm-border space-y-1 animate-fade-in">
                            <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Performance</div>
                            <div className="flex justify-between">
                              <span>Load Time:</span>
                              <span className="text-emerald-400 font-sans">{activePin.routeLoadTime}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>FID Metric:</span>
                              <span className="text-white font-sans">{activePin.performanceMetrics?.fid}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>LCP Metric:</span>
                              <span className="text-white font-sans">{activePin.performanceMetrics?.lcp}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMode === 'shadow-dom' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">SHADOW HOST</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block">{activePin.shadowHost}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">ROOT MODE</span>
                            <span className="text-fuchsia-400 font-mono font-bold bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block">{activePin.shadowMode}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">COMPOSED PATH</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border break-all leading-normal font-mono">{activePin.composedPath}</span>
                          </div>
                        </div>
                      )}

                      {/* Comments Form */}
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

                    <div className="pt-2 border-t border-pm-border space-y-2 bg-pm-surface-2/95">
                      <button 
                        onClick={() => setShowConversion(true)}
                        className="w-full py-2 rounded bg-pm-accent hover:bg-pm-accent-bright text-white text-center font-bold text-[8.5px] uppercase tracking-wider shadow-accent transition-colors duration-300 cursor-pointer"
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

              {/* Conversion Interception Overlay */}
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
                      <p className="text-xs text-pm-muted leading-relaxed font-sans">
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
                        className="px-5 py-2.5 bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-text border border-pm-border text-xs font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sandbox watermark */}
              <div className="absolute bottom-2 left-4 font-mono text-[8px] text-pm-muted/20 pointer-events-none select-none">
                [PixelMark Engine: sandbox state active]
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Walkthrough Workflow Strip */}
        <div className="py-6 border-t border-b border-pm-border/30 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {onboardingSteps.map((step) => (
            <div key={step.num} className="flex gap-3 items-start p-2">
              <span className="w-5 h-5 rounded bg-pm-accent/20 border border-pm-accent/30 flex items-center justify-center font-display text-[10px] font-bold text-pm-accent-vivid flex-shrink-0 mt-0.5 transition-colors duration-500">
                {step.num}
              </span>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{step.title}</h4>
                <p className="text-[9px] text-pm-muted leading-normal font-sans">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lower Layout: 5 Capability Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {systems.map((sys) => {
            const isActive = activeMode === sys.id;
            return (
              <motion.div
                key={sys.id}
                onMouseEnter={() => {
                  if (!isLoading) {
                    setActiveMode(sys.id);
                  }
                }}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`p-5 rounded-2xl border border-pm-border bg-pm-surface/30 text-left transition-all duration-500 cursor-pointer ${sys.border} ${isActive ? `${sys.glow} border-pm-accent/50 bg-pm-surface-2/40` : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg ${sys.accentBg} flex items-center justify-center ${sys.color} transition-colors duration-500`}>
                    <sys.icon className="w-4 h-4" />
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pm-accent animate-pulse" />
                  )}
                </div>
                <h4 className="font-display text-xs font-bold text-white mb-1.5 uppercase tracking-wide">
                  {sys.name}
                </h4>
                <p className="text-[10px] text-pm-muted leading-relaxed font-sans">
                  {sys.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
