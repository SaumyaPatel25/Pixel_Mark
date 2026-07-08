'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Zap, MousePointer2, Search, RefreshCw, Globe, Box, Grid, Compass, HelpCircle, CheckCircle2, Layers, Info, Trash2, PlusCircle, Play } from 'lucide-react';
import Link from 'next/link';
import { ModeType } from './HomeClient';
import { useAuthStore } from '@/store/authStore';

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
  onHoverChange: (pos: { x: number; y: number } | null) => void;
}

type DemoState = 'mockDemo' | 'sandboxReady' | 'sandboxActive';
type DemoStep = 'chooseMode' | 'hoverTarget' | 'dropPin' | 'openDrawer' | 'submitFeedback';

const cursorTargets = {
  dom: { x: 60, y: 65, label: 'h2.heading-main', selector: 'html > body > main > h2.heading-main' },
  threejs: { x: 50, y: 45, label: 'Mesh#cube-01', selector: 'html > body > main > canvas#threejs-canvas' },
  webgl: { x: 55, y: 50, label: 'canvas#shader-canvas', selector: 'html > body > main > canvas#shader-canvas' },
  spa: { x: 45, y: 58, label: 'div.card-feed', selector: 'html > body > main > div.card-feed' },
  'shadow-dom': { x: 52, y: 60, label: 'button.btn-like', selector: 'button.btn-like' }
};

const getMockPinForMode = (mode: ModeType, x: number, y: number): MockPin => {
  switch (mode) {
    case 'dom':
      return {
        id: 1,
        x,
        y,
        element: '<button#demo-cta-btn>',
        selector: 'html > body > main > div > button.btn-cta',
        xpath: '/html/body/main/div/button',
        width: '160px',
        height: '40px',
        display: 'inline-block'
      };
    case 'threejs':
      return {
        id: 2,
        x,
        y,
        element: 'Mesh#cube-01',
        selector: 'html > body > main > canvas#threejs-canvas',
        meshName: 'Mesh#cube-01',
        geometry: 'BoxGeometry(4, 4, 4)',
        material: 'MeshStandardMaterial',
        raycastCoords: '[1.45, -0.89, 0.12]',
        faceIndex: 4
      };
    case 'webgl':
      return {
        id: 3,
        x,
        y,
        element: 'canvas#shader-canvas',
        selector: 'html > body > main > canvas#shader-canvas',
        webglContext: 'webgl2',
        gpuVendor: 'Google Inc. (NVIDIA)',
        gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)',
        canvasX: 231,
        canvasY: 184
      };
    case 'spa':
      return {
        id: 4,
        x,
        y,
        element: 'div.card-feed',
        selector: 'html > body > main > div.card-feed',
        activeRoute: '/explore',
        routeHistory: ['/', '/explore'],
        routeLoadTime: '42ms',
        performanceMetrics: { fid: '8ms', lcp: '240ms' }
      };
    case 'shadow-dom':
      return {
        id: 5,
        x,
        y,
        element: 'button.btn-like',
        selector: 'button.btn-like',
        shadowHost: '<custom-card>',
        shadowMode: 'open',
        composedPath: 'custom-card => shadow-root => div.footer > button.btn-like'
      };
  }
};

export default function HeroSection({ activeMode, setActiveMode, onHoverChange }: HeroSectionProps) {
  const isFirstRender = useRef(true);

  // Demo State Machine: mockDemo -> sandboxReady -> sandboxActive
  const [demoState, setDemoState] = useState<DemoState>('mockDemo');
  const [demoStep, setDemoStep] = useState<DemoStep>('chooseMode');

  const [urlInput, setUrlInput] = useState('https://entrext.com');
  const [currentUrl, setCurrentUrl] = useState('https://entrext.com');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showConversion, setShowConversion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && !!user;
  
  // Interactive guided demo states
  const [activePin, setActivePin] = useState<MockPin | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Local state for SPA mode simulated route
  const [spaTab, setSpaTab] = useState<'home' | 'explore' | 'settings'>('explore');

  // Sandbox active state variables
  const [isFeedbackMode, setIsFeedbackMode] = useState(true);
  const [pinsList, setPinsList] = useState<MockPin[]>([]);

  // Cinematic & Interactive Mode states
  const [isInteractive, setIsInteractive] = useState(false);
  const [cinematicStep, setCinematicStep] = useState(0);
  const [typedComment, setTypedComment] = useState('');
  const [commentInput, setCommentInput] = useState('');

  // Start interactive sandbox mode
  const startInteractiveMode = () => {
    setIsInteractive(true);
    setDemoState('sandboxActive');
    setActivePin(null);
    setDrawerOpen(false);
    setHoveredElement(null);
    setTypedComment('');
    setCommentInput('');
  };

  // Reset sequence when activeMode changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActivePin(null);
    setDrawerOpen(false);
    // Switch to interactive mode if they click other tabs
    setIsInteractive(true);
  }, [activeMode]);

  // Cinematic Auto-playing Sequence
  useEffect(() => {
    if (isInteractive) return;

    if (cinematicStep === 0) {
      setTypedComment('');
      setActivePin(null);
      setDrawerOpen(false);
      setHoveredElement(null);
      setShowConversion(false);
    }

    let timer: any;
    if (cinematicStep === 0) {
      // Step 1: Cursor entering
      timer = setTimeout(() => {
        setCinematicStep(1);
      }, 100);
    } else if (cinematicStep === 1) {
      // Step 2: Hover State & Glide to button
      timer = setTimeout(() => {
        setCinematicStep(2);
      }, 1500); // 1.5s glide
    } else if (cinematicStep === 2) {
      // Step 3: Click button & Pin drop
      setHoveredElement('button');
      timer = setTimeout(() => {
        const mockPin = {
          id: 9999,
          x: 50,
          y: 75,
          element: '<button#demo-cta-btn>',
          selector: 'html > body > main > div > button.btn-cta',
          xpath: '/html/body/main/div/button',
          width: '160px',
          height: '40px',
          display: 'inline-block'
        };
        setActivePin(mockPin);
        setCinematicStep(3);
      }, 1000); // Hold hover for 1s then click
    } else if (cinematicStep === 3) {
      // Step 4: Drawer Slides In
      timer = setTimeout(() => {
        setDrawerOpen(true);
        setCinematicStep(4);
      }, 600); // Pin bounce duration
    } else if (cinematicStep === 4) {
      // Step 5: Evidence Auto-Populates & Text Types
      const fullText = "Button hover state is sluggish.";
      let currentLength = 0;
      const typeTimer = setInterval(() => {
        currentLength++;
        setTypedComment(fullText.slice(0, currentLength));
        if (currentLength >= fullText.length) {
          clearInterval(typeTimer);
          setCinematicStep(5);
        }
      }, 50); // ~1.5s typing
      return () => clearInterval(typeTimer);
    } else if (cinematicStep === 5) {
      // Step 6: Cursor glides to the submit button inside the drawer
      timer = setTimeout(() => {
        setCinematicStep(6);
      }, 1500); // 1.5s glide to submit
    } else if (cinematicStep === 6) {
      // Step 7: Click submit button, triggering conversion overlay
      timer = setTimeout(() => {
        setShowConversion(true);
        setCinematicStep(7);
      }, 500); // click delay
    } else if (cinematicStep === 7) {
      // Step 8: Hold conversion overlay for 8 seconds, then loop
      timer = setTimeout(() => {
        setShowConversion(false);
        setCinematicStep(0);
      }, 8000);
    }

    return () => clearTimeout(timer);
  }, [cinematicStep, isInteractive]);

  // Show Conversion when Launch Sandbox is clicked
  const launchSandbox = () => {
    if (demoState !== 'sandboxActive' || !isInteractive) {
      startInteractiveMode();
    } else {
      setShowConversion(true);
    }
  };

  const previewX = useMotionValue(0.5);
  const previewY = useMotionValue(0.5);
  const previewRotateX = useSpring(useTransform(previewY, [0, 1], [4, -4]), { stiffness: 120, damping: 18 });
  const previewRotateY = useSpring(useTransform(previewX, [0, 1], [-4, 4]), { stiffness: 120, damping: 18 });

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    previewX.set((e.clientX - rect.left) / rect.width);
    previewY.set((e.clientY - rect.top) / rect.height);
  };

  const handlePreviewMouseLeave = () => {
    previewX.set(0.5);
    previewY.set(0.5);
    onHoverChange(null);
  };

  const handlePreviewMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
    const y = (rect.top + rect.height / 2) / window.innerHeight - 0.5;
    onHoverChange({ x, y });
  };

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
      setLoadingText('Loading page content...');
    }, 1000);

    setTimeout(() => {
      setIsLoading(false);
      setCurrentUrl(urlInput);
      setActiveMode('dom');
      setIsInteractive(true);
      setDemoState('sandboxActive');
    }, 1500);
  };

  // Click handler to drop a pin inside the interactive sandboxActive mode
  const handleAddSandboxPin = (
    elementName: string,
    selector: string,
    e: React.MouseEvent,
    customProps?: Partial<MockPin>
  ) => {
    e.stopPropagation();
    if (demoState !== 'sandboxActive' || !isFeedbackMode || isLoading || showConversion) return;

    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;

      const newPin: MockPin = {
        id: Date.now(),
        x: clickX,
        y: clickY,
        element: elementName,
        selector: selector,
        ...customProps
      };

      setPinsList(prev => [...prev, newPin]);
      setActivePin(newPin);
      setDrawerOpen(true);
    }
  };

  // Click handler on general preview frame
  const handleGeneralPreviewClick = (e: React.MouseEvent) => {
    if (demoState !== 'sandboxActive' || !isFeedbackMode) return;

    if (activeMode === 'dom') {
      handleAddSandboxPin('<div.container>', 'html > body > main > div.container', e, {
        xpath: '/html/body/main/div',
        width: '960px',
        height: '400px',
        display: 'block'
      });
    } else if (activeMode === 'threejs') {
      handleAddSandboxPin('Mesh#sphere-02', 'html > body > main > canvas#threejs-canvas', e, {
        meshName: 'Mesh#sphere-02',
        geometry: 'SphereGeometry(2, 32, 32)',
        material: 'MeshPhongMaterial',
        raycastCoords: '[0.54, 1.12, -0.98]',
        faceIndex: 12
      });
    } else if (activeMode === 'webgl') {
      const rect = previewRef.current?.getBoundingClientRect();
      const cx = rect ? Math.round(e.clientX - rect.left) : 231;
      const cy = rect ? Math.round(e.clientY - rect.top) : 184;
      handleAddSandboxPin('canvas#shader-canvas', 'html > body > main > canvas#shader-canvas', e, {
        webglContext: 'webgl2',
        gpuVendor: 'Google Inc. (NVIDIA)',
        gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)',
        canvasX: cx,
        canvasY: cy
      });
    } else if (activeMode === 'spa') {
      handleAddSandboxPin('div.home-card', 'html > body > main > div.home-card', e, {
        activeRoute: `/${spaTab}`,
        routeHistory: ['/', `/explore`, `/${spaTab}`],
        routeLoadTime: '36ms',
        performanceMetrics: { fid: '7ms', lcp: '210ms' }
      });
    } else if (activeMode === 'shadow-dom') {
      handleAddSandboxPin('img.avatar-img', 'img.avatar-img', e, {
        shadowHost: '<user-avatar>',
        shadowMode: 'open',
        composedPath: 'user-avatar => shadow-root => div.container > img.avatar-img'
      });
    }
  };

  // Systems details matching 5 modes
  const systems = [
    {
      id: 'dom' as ModeType,
      name: 'Standard Layout',
      icon: Globe,
      color: 'text-purple-400',
      glow: 'shadow-[0_0_20px_rgba(124,58,237,0.15)]',
      border: 'hover:border-purple-500/30',
      accentBg: 'bg-purple-500/10',
      description: 'Resolves element selectors, computed CSS styles & layout parameters.'
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
      name: 'Encapsulated Element',
      icon: Layers,
      color: 'text-fuchsia-400',
      glow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)]',
      border: 'hover:border-fuchsia-500/30',
      accentBg: 'bg-fuchsia-500/10',
      description: 'Traverses encapsulated layouts to pinpoint nested elements.'
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
      hint: 'Click elements inside the mockup site (like the hero heading, logo, or CTA button) to see how the layout capture engine isolates computed CSS styles and selectors in real-time.',
      label: 'Visual Layout Sandbox',
    },
    threejs: {
      hint: 'Click anywhere on the spinning 3D cube model. The Three.js raycaster captures absolute 3D mesh vectors, face indices, and active geometry data automatically.',
      label: 'Three.js 3D Raycaster',
    },
    webgl: {
      hint: 'Click the animated WebGL shader substrate canvas. The renderer engine isolates the raw drawing buffer, recording WebGL context attributes and GPU specifications.',
      label: 'WebGL Canvas Buffer',
    },
    spa: {
      hint: 'Navigate client-side using the tab routing bar (/index, /explore, /settings). Place comments inside each sub-view to verify pins filter reactively based on active routes.',
      label: 'SPA Router Sandbox',
    },
    'shadow-dom': {
      hint: 'Click inside custom component interfaces. The traversal engine follows the composed path inside encapsulated components to record elements hidden from standard selectors.',
      label: 'Encapsulated Layout Traverser',
    },
  };

  // Find coordinates based on demo step
  const getCursorPosition = () => {
    if (demoStep === 'chooseMode') {
      return { x: 32, y: -4 };
    }
    const target = cursorTargets[activeMode];
    return { x: target.x, y: target.y };
  };

  return (
    <section className="relative min-h-screen pt-[88px] pb-16 flex flex-col justify-center overflow-hidden bg-transparent dot-grid">
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
            <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-lg bg-[#F0F5F9] border border-pm-border text-[#293681] text-[10px] font-bold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 fill-[#293681]/10 text-[#293681]" />
              <span>Visual QA Sandbox</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6.5xl font-bold tracking-tight text-[#1E2022] leading-[1.05] transition-all duration-500">
              Visual Website Feedback <br />
              <span className="text-[#293681] font-extrabold">& QA Bug Reporting.</span>
            </h1>

            <p className="text-xs md:text-sm text-pm-muted leading-relaxed max-w-lg font-sans">
              Share secure client review links to pin visual feedback, annotations, and QA comments directly on live pages. The visual UI feedback tool and design review software built for teams who want to sign off website changes faster.
            </p>

            {/* URL Interactive Input */}
            <form
              onSubmit={handleUrlSubmit}
              className="flex items-center gap-2 max-w-md w-full bg-white border border-pm-border p-1.5 rounded-xl focus-within:border-[#293681]/50 focus-within:ring-1 focus-within:ring-[#293681]/20 transition-all duration-300 shadow-sm"
            >
              <div className="flex items-center gap-2 flex-1 pl-2 text-pm-muted">
                <Search className="w-4 h-4 text-pm-muted/65" />
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
                className="px-4 py-2 bg-[#293681] hover:bg-[#112E81] disabled:bg-pm-surface-3 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load'}
              </button>
            </form>

            {/* Micro Onboarding Copy */}
            <div className="space-y-1.5 max-w-md p-4 rounded-xl border border-pm-border bg-white shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#293681] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#293681]/80" />
                <span>{isInteractive ? 'Active Sandbox Workspace' : 'Interactive Walkthrough'}</span>
              </div>
              <p className="text-[10px] text-pm-muted leading-normal font-sans">
                {modeExplainer[activeMode].hint}
              </p>
            </div>

            <div className="flex gap-4 pt-1">
              <Link
                href="/register"
                className="px-6 py-3 bg-[#293681] hover:bg-[#112E81] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 active:translate-y-0 duration-300 flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                Start a Free Review
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  setDemoState('mockDemo');
                  setIsInteractive(false);
                  setCinematicStep(0);
                }}
                className="px-6 py-3 bg-[#F0F5F9] hover:bg-[#E2ECF5] text-[#293681] border border-pm-border rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 duration-300"
              >
                See how it works →
              </button>
            </div>

            {/* Social proof / Trust tagline */}
            <p className="text-[10px] text-pm-text-faint font-sans tracking-wide leading-relaxed pt-2 max-w-sm">
              Built for web agencies, freelancers, and dev teams who are tired of reviewing websites over email.
            </p>
          </div>

          {/* Right Column: Dynamic Mockup Browser & Mode Switcher */}
          <div className="lg:col-span-7 flex flex-col space-y-3 w-full">
            
            {/* Guide strip explaining current step during mockDemo */}
            {demoState === 'mockDemo' && (
              <div className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-white border border-pm-border text-[9px] text-pm-muted font-sans shadow-sm animate-fade-in">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#293681]">
                  <Info className="w-3.5 h-3.5 text-[#293681]" />
                  <span>Interactive Walkthrough Loop</span>
                </div>
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {([
                    { step: 'chooseMode', label: '1. Choose Stack', activeForSteps: [0] },
                    { step: 'hoverTarget', label: '2. Hover', activeForSteps: [1, 2] },
                    { step: 'dropPin', label: '3. Drop Pin', activeForSteps: [3] },
                    { step: 'openDrawer', label: '4. View Specs', activeForSteps: [4, 5] },
                    { step: 'submitFeedback', label: '5. Submit', activeForSteps: [6, 7] }
                  ] as { step: DemoStep, label: string, activeForSteps: number[] }[]).map((s) => {
                    const isActive = isInteractive ? (demoStep === s.step) : s.activeForSteps.includes(cinematicStep);
                    return (
                      <span
                        key={s.step}
                        className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all duration-300 ${isActive ? 'bg-[#293681] text-white shadow-sm' : 'bg-pm-surface-2 text-pm-muted/60 border border-pm-border'}`}
                      >
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

             {/* Sandbox Ready Banner Card */}
            {demoState === 'sandboxReady' && (
              <div className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-[#F0F5F9] border border-pm-border text-[10px] text-[#1E2022] font-sans animate-fade-in shadow-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#293681] animate-bounce" />
                  <div>
                    <span className="font-bold">Walkthrough Complete!</span> Ready to test? Launch sandbox to drop custom pins.
                  </div>
                </div>
                <button
                  onClick={launchSandbox}
                  className="px-3 py-1.5 bg-[#293681] hover:bg-[#112E81] rounded-lg text-[9px] font-bold uppercase tracking-wider text-white cursor-pointer flex items-center gap-1 transition-all shadow-sm hover:shadow-md"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Launch Sandbox</span>
                </button>
              </div>
            )}

            {/* Browser Mode Switcher above the preview */}
            <div className="flex items-center gap-1 p-1 bg-white border border-pm-border rounded-xl self-start max-w-full overflow-x-auto scrollbar-none shadow-sm">
              {(['dom', 'threejs', 'webgl', 'spa', 'shadow-dom'] as ModeType[]).map((mode) => {
                const isSelected = activeMode === mode;
                const label = mode === 'dom' ? 'Layout' : mode === 'threejs' ? 'Three.js' : mode === 'webgl' ? 'WebGL' : mode === 'spa' ? 'SPA' : 'Encapsulated';
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setActiveMode(mode);
                      if (demoState === 'sandboxReady') {
                        setDemoState('mockDemo');
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${isSelected ? 'bg-[#293681] text-white font-extrabold shadow-sm' : 'text-pm-muted hover:text-[#293681] hover:bg-[#F0F5F9]'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Mockup Browser Container */}
            <motion.div 
              style={{
                rotateX: previewRotateX,
                rotateY: previewRotateY,
                transformStyle: 'preserve-3d',
              }}
              onMouseMove={handlePreviewMouseMove}
              onMouseLeave={handlePreviewMouseLeave}
              onMouseEnter={handlePreviewMouseEnter}
              className="mockup-browser relative w-full aspect-[4/3] rounded-3xl border border-pm-border bg-white overflow-hidden shadow-[0_20px_50px_rgba(41,54,129,0.06)] hover:shadow-[0_20px_50px_rgba(41,54,129,0.1)] transition-all duration-500"
            >
              
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
                
                <div className="w-24 flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setActivePin(null); setDrawerOpen(false); }}
                    className="p-1 hover:bg-pm-surface-3 rounded text-pm-muted hover:text-red-400 transition-colors cursor-pointer"
                    title="Clear Pin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sandbox Workspace / Webpage Area */}
              <div 
                ref={previewRef}
                onClick={(e) => {
                  if (!isInteractive) {
                    e.stopPropagation();
                    startInteractiveMode();
                  } else {
                    handleGeneralPreviewClick(e);
                  }
                }}
                className="absolute inset-0 pt-10 bg-pm-bg font-sans z-0 select-none overflow-hidden cursor-pointer"
              >
                {/* Scanlines / CRT filter effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.012)_50%,rgba(0,0,0,0.12)_50%)] bg-[size:100%_4px] pointer-events-none" />



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
                              onClick={(e) => {
                                if (demoState === 'sandboxActive') {
                                  handleAddSandboxPin('<a.logo>', 'html > body > header > a.logo', e, {
                                    xpath: '/html/body/header/a',
                                    width: '120px',
                                    height: '24px',
                                    display: 'flex'
                                  });
                                }
                              }}
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
                            onClick={(e) => {
                              if (demoState === 'sandboxActive') {
                                handleAddSandboxPin('<h2.heading-main>', 'html > body > main > h2.heading-main', e, {
                                  xpath: '/html/body/main/h2',
                                  width: '384px',
                                  height: '64px',
                                  display: 'block'
                                });
                              }
                            }}
                            className={`text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-tight hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 transition-all ${hoveredElement === 'heading' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2 bg-pm-accent/5' : ''}`}
                          >
                            Engineering the <br />Next-Gen Web.
                          </h2>
                          
                          <p className="text-[10px] text-pm-muted leading-relaxed font-sans">
                            From automated sandboxes to precision website annotation tools, we turn complex workflows into friction-free user experiences.
                          </p>
                          
                          <button 
                            onClick={(e) => {
                              if (demoState === 'sandboxActive') {
                                handleAddSandboxPin('<button#demo-cta-btn>', 'html > body > main > div > button.btn-cta', e, {
                                  xpath: '/html/body/main/div/button',
                                  width: '160px',
                                  height: '40px',
                                  display: 'inline-block'
                                });
                              }
                            }}
                            className={`px-5 py-2.5 bg-pm-accent text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 transition-all ${hoveredElement === 'button' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2 bg-pm-accent-bright' : ''}`}
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
                              onClick={(e) => {
                                if (demoState === 'sandboxActive') {
                                  handleAddSandboxPin('Mesh#cube-01', 'html > body > main > canvas#threejs-canvas', e, {
                                    meshName: 'Mesh#cube-01',
                                    geometry: 'BoxGeometry(4, 4, 4)',
                                    material: 'MeshStandardMaterial',
                                    raycastCoords: '[1.45, -0.89, 0.12]',
                                    faceIndex: 4
                                  });
                                }
                              }}
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
                              if (demoState === 'sandboxActive') {
                                const rect = previewRef.current?.getBoundingClientRect();
                                const cx = rect ? Math.round(e.clientX - rect.left) : 231;
                                const cy = rect ? Math.round(e.clientY - rect.top) : 184;
                                handleAddSandboxPin('canvas#shader-canvas', 'html > body > main > canvas#shader-canvas', e, {
                                  webglContext: 'webgl2',
                                  gpuVendor: 'Google Inc. (NVIDIA)',
                                  gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)',
                                  canvasX: cx,
                                  canvasY: cy
                                });
                              }
                            }}
                            className={`w-full max-w-xs h-28 bg-pm-surface-2 rounded-xl border border-pm-border hover:border-pm-accent-bright/50 overflow-hidden relative transition-all ${hoveredElement === 'shader-canvas' ? 'border-pm-accent shadow-[0_0_20px_var(--pm-accent-glow)]' : ''}`}
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
                                  onClick={(e) => {
                                    if (demoState === 'sandboxActive') {
                                      handleAddSandboxPin('div.home-card', 'html > body > main > div.home-card', e, {
                                        activeRoute: '/home',
                                        routeHistory: ['/', '/explore', '/home'],
                                        routeLoadTime: '28ms',
                                        performanceMetrics: { fid: '6ms', lcp: '190ms' }
                                      });
                                    }
                                  }}
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
                                  onClick={(e) => {
                                    if (demoState === 'sandboxActive') {
                                      handleAddSandboxPin('div.card-feed', 'html > body > main > div.card-feed', e, {
                                        activeRoute: '/explore',
                                        routeHistory: ['/', '/explore'],
                                        routeLoadTime: '42ms',
                                        performanceMetrics: { fid: '8ms', lcp: '240ms' }
                                      });
                                    }
                                  }}
                                >
                                  <h4 className="text-[9px] text-white font-bold font-display">Explore Content Feed</h4>
                                  <div className={`p-2.5 rounded-lg bg-pm-surface-2 border border-pm-border space-y-1.5 transition-all ${hoveredElement === 'spa-card' ? 'border-pm-accent shadow-[0_0_15px_var(--pm-accent-glow)] bg-pm-accent/5' : ''}`}>
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
                                  onClick={(e) => {
                                    if (demoState === 'sandboxActive') {
                                      handleAddSandboxPin('form.settings-form', 'html > body > main > form.settings', e, {
                                        activeRoute: '/settings',
                                        routeHistory: ['/', '/explore', '/settings'],
                                        routeLoadTime: '32ms',
                                        performanceMetrics: { fid: '6ms', lcp: '200ms' }
                                      });
                                    }
                                  }}
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
                            Encapsulated Element Traversal
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
                                  onClick={(e) => {
                                    if (demoState === 'sandboxActive') {
                                      handleAddSandboxPin('button.btn-like', 'button.btn-like', e, {
                                        shadowHost: '<custom-card>',
                                        shadowMode: 'open',
                                        composedPath: 'custom-card => shadow-root => div.footer > button.btn-like'
                                      });
                                    }
                                  }}
                                  className={`px-2 py-1 bg-pm-accent hover:bg-pm-accent-bright text-white rounded text-[7px] font-bold transition-all cursor-pointer ${hoveredElement === 'nested-button' ? 'scale-105 shadow-[0_0_12px_var(--pm-accent-glow)] ring-1 ring-white' : ''}`}
                                >
                                  &lt;button.btn-like&gt;
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guided Loop Cursor Indicator */}
                      {demoState === 'mockDemo' && isInteractive && (
                        <motion.div
                          animate={{
                            left: `${getCursorPosition().x}%`,
                            top: `${getCursorPosition().y}%`,
                            scale: demoStep === 'dropPin' ? 0.8 : 1
                          }}
                          transition={{ type: 'spring', stiffness: 90, damping: 15 }}
                          className="absolute w-5 h-5 pointer-events-none z-50 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                        >
                          <MousePointer2 className="w-4.5 h-4.5 text-white fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                          {(demoStep === 'hoverTarget' || demoStep === 'dropPin') && (
                            <motion.div
                              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="absolute w-8 h-8 rounded-full border border-white"
                            />
                          )}
                        </motion.div>
                      )}

                      {/* Mock Pin Layer for Guided Demo mode */}
                      {demoState === 'mockDemo' && activePin && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${activePin.x}%`, top: `${activePin.y}%` }}
                        >
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-pm-accent/40 animate-ping opacity-75" />
                            <div className={`w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg ${((isInteractive && demoStep === 'submitFeedback') || (!isInteractive && cinematicStep >= 6)) ? 'bg-emerald-500' : 'bg-pm-accent'}`}>
                              {((isInteractive && demoStep === 'submitFeedback') || (!isInteractive && cinematicStep >= 6)) ? '✓' : '1'}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Real interactive pins layer inside sandboxActive mode */}
                      {demoState === 'sandboxActive' && pinsList.map((pin, index) => (
                        <motion.div
                          key={pin.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePin(pin);
                            setDrawerOpen(true);
                          }}
                        >
                          <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-pm-accent/40 animate-ping opacity-75" />
                            <div className={`w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg transition-colors ${activePin?.id === pin.id ? 'bg-pm-accent-bright ring-2 ring-pm-accent-vivid' : 'bg-pm-accent'}`}>
                              {index + 1}
                            </div>
                          </div>
                        </motion.div>
                      ))}

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
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${((isInteractive && demoStep === 'submitFeedback') || (!isInteractive && cinematicStep >= 6)) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pm-accent/20 text-pm-accent-vivid'}`}>
                          {((isInteractive && demoStep === 'submitFeedback') || (!isInteractive && cinematicStep >= 6)) ? 'SUBMITTED' : 'DRAFT'}
                        </span>
                      </div>

                      {/* Screenshot thumbnail mockup */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: (isInteractive || cinematicStep >= 4) ? 1 : 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-pm-bg rounded border border-pm-border p-1 text-center"
                      >
                        <div className="text-white/40 uppercase tracking-widest text-[7px] font-bold mb-1">Screenshot Evidence</div>
                        <div className="h-14 bg-pm-surface-3 rounded border border-pm-border flex flex-col items-center justify-center text-[7px] text-pm-muted overflow-hidden relative">
                          <div className="px-3 py-1.5 bg-pm-accent text-white text-[6px] font-bold rounded border border-pm-accent-bright/30 scale-90">
                            LAUNCH SANDBOX
                          </div>
                          <div className="absolute top-1 right-1 text-[6px] text-pm-accent-vivid font-bold font-mono">160 × 40 px</div>
                        </div>
                      </motion.div>

                      {/* Mode-adaptive drawer fields */}
                      {activeMode === 'dom' && (
                        <div className="space-y-2.5">
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: (isInteractive || cinematicStep >= 4) ? 1 : 0, x: (isInteractive || cinematicStep >= 4) ? 0 : -10 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="space-y-1"
                          >
                            <span className="text-pm-accent-vivid font-bold block">TARGET ELEMENT</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block break-all">{activePin.element}</span>
                          </motion.div>
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: (isInteractive || cinematicStep >= 4) ? 1 : 0, x: (isInteractive || cinematicStep >= 4) ? 0 : -10 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="space-y-1"
                          >
                            <span className="text-pm-accent-vivid font-bold block">SELECTOR</span>
                            <span className="text-pm-muted text-[8px] block break-all bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.selector}</span>
                          </motion.div>
                          {activePin.xpath && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: (isInteractive || cinematicStep >= 4) ? 1 : 0, x: (isInteractive || cinematicStep >= 4) ? 0 : -10 }}
                              transition={{ duration: 0.3, delay: 0.3 }}
                              className="space-y-1"
                            >
                              <span className="text-pm-accent-vivid font-bold block">XPATH</span>
                              <span className="text-pm-muted text-[8px] block break-all bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.xpath}</span>
                            </motion.div>
                          )}
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: (isInteractive || cinematicStep >= 4) ? 1 : 0, y: (isInteractive || cinematicStep >= 4) ? 0 : 10 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            className="bg-pm-bg p-2 rounded border border-pm-border space-y-1"
                          >
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
                          </motion.div>
                        </div>
                      )}

                      {activeMode === 'threejs' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">3D MESH NAME</span>
                            <span className="text-white font-mono bg-pm-bg px-1.5 py-0.5 rounded border border-pm-border inline-block">{activePin.meshName || 'Mesh#cube-01'}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">GEOMETRY</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.geometry || 'BoxGeometry'}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-pm-accent-vivid font-bold block">MATERIAL</span>
                            <span className="text-pm-muted text-[8px] block bg-pm-bg p-1.5 rounded border border-pm-border">{activePin.material || 'MeshStandardMaterial'}</span>
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
                            value={isInteractive ? commentInput : typedComment}
                            onChange={(e) => isInteractive && setCommentInput(e.target.value)}
                            readOnly={!isInteractive}
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
                        onClick={() => {
                          if (!isInteractive) {
                            startInteractiveMode();
                          } else {
                            setShowConversion(true);
                          }
                        }}
                        className={`w-full py-2 rounded text-white text-center font-bold text-[8.5px] uppercase tracking-wider transition-all duration-300 cursor-pointer bg-pm-accent hover:bg-pm-accent-bright shadow-accent`}
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
                        Why don't you try it yourself?
                      </h3>
                      <p className="text-xs text-pm-muted leading-relaxed font-sans">
                        Initialize your sandbox, invite reviewers, and map precision visual annotations in seconds.
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <Link
                        href={isUserLoggedIn ? "/dashboard" : "/register"}
                        className="px-5 py-2.5 bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-accent transition-colors"
                      >
                        {isUserLoggedIn ? "Go to Dashboard" : "Start Free Project"}
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

              {/* Cinematic Fake Cursor */}
              {!isInteractive && activeMode === 'dom' && (
                <motion.div
                  initial={{ left: '90%', top: '95%', opacity: 0, scale: 1 }}
                  animate={
                    cinematicStep === 0
                      ? { left: '90%', top: '95%', opacity: 0, scale: 1 }
                      : cinematicStep === 1
                      ? { left: '50%', top: '78%', opacity: 1, scale: 1 }
                      : cinematicStep === 2
                      ? { left: '50%', top: '78%', opacity: 1, scale: 0.85 } // simulated click scale-down
                      : cinematicStep === 3
                      ? { left: '50%', top: '78%', opacity: 1, scale: 1 }
                      : cinematicStep === 4
                      ? { left: '50%', top: '78%', opacity: 0.4, scale: 1 } // semi-faded during typing
                      : cinematicStep === 5
                      ? { left: '86%', top: '92%', opacity: 1, scale: 1 } // glide to submit button in drawer
                      : cinematicStep === 6
                      ? { left: '86%', top: '92%', opacity: 1, scale: 0.85 } // click submit button
                      : { left: '86%', top: '92%', opacity: 0, scale: 1 } // fade out on overlay show
                  }
                  transition={{
                    type: 'tween',
                    ease: 'easeInOut',
                    duration: 
                      cinematicStep === 1 ? 1.2 : 
                      cinematicStep === 2 ? 0.2 : 
                      cinematicStep === 5 ? 1.4 : 
                      cinematicStep === 6 ? 0.2 : 0.3
                  }}
                  className="absolute pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <svg
                    className="w-5 h-5 text-white fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4.5 3v15.25l3.96-3.96 2.37 5.71 2.37-.98-2.37-5.71h5.67L4.5 3z" />
                  </svg>
                </motion.div>
              )}

              {/* Sandbox watermark */}
              <div className="absolute bottom-2 left-4 font-mono text-[8px] text-pm-muted/20 pointer-events-none select-none">
                [PixelMark Engine: sandbox state active]
              </div>
            </motion.div>
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
