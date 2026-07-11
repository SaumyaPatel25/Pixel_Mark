'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Zap, MousePointer2, Search, RefreshCw, Globe, Box, Grid, Compass, HelpCircle, CheckCircle2, Layers, Info, Trash2, PlusCircle, Play } from 'lucide-react';
import Link from 'next/link';
import { ModeType } from './HomeClient';
import { useAuthStore } from '@/store/authStore';
import AmbientParallaxBackground from './AmbientParallaxBackground';

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
  onHeroTextComplete?: () => void;
  isHeroTextComplete?: boolean;
}

type DemoState = 'awaitingUrl' | 'mockDemo' | 'sandboxReady' | 'sandboxActive';
type DemoStep = 'chooseMode' | 'hoverTarget' | 'dropPin' | 'openDrawer' | 'submitFeedback';

const modeColors = {
  dom: {
    accent: '#7c3aed',
    bright: '#8b5cf6',
    vivid: '#a78bfa',
    glow: 'rgba(124, 58, 237, 0.35)',
    subtle: 'rgba(124, 58, 237, 0.08)',
    mid: 'rgba(124, 58, 237, 0.16)',
    gradientEnd: '#06b6d4',
    borderBright: 'rgba(140, 120, 255, 0.22)',
  },
  threejs: {
    accent: '#06b6d4',
    bright: '#0891b2',
    vivid: '#22d3ee',
    glow: 'rgba(6, 182, 212, 0.35)',
    subtle: 'rgba(6, 182, 212, 0.08)',
    mid: 'rgba(6, 182, 212, 0.16)',
    gradientEnd: '#3b82f6',
    borderBright: 'rgba(6, 182, 212, 0.22)',
  },
  webgl: {
    accent: '#d97706',
    bright: '#f59e0b',
    vivid: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.35)',
    subtle: 'rgba(245, 158, 11, 0.08)',
    mid: 'rgba(245, 158, 11, 0.16)',
    gradientEnd: '#06b6d4',
    borderBright: 'rgba(245, 158, 11, 0.22)',
  },
  spa: {
    accent: '#059669',
    bright: '#10b981',
    vivid: '#34d399',
    glow: 'rgba(16, 185, 129, 0.35)',
    subtle: 'rgba(16, 185, 129, 0.08)',
    mid: 'rgba(16, 185, 129, 0.16)',
    gradientEnd: '#14b8a6',
    borderBright: 'rgba(16, 185, 129, 0.22)',
  },
  'shadow-dom': {
    accent: '#c026d3',
    bright: '#d946ef',
    vivid: '#e879f9',
    glow: 'rgba(217, 70, 239, 0.35)',
    subtle: 'rgba(217, 70, 239, 0.08)',
    mid: 'rgba(217, 70, 239, 0.16)',
    gradientEnd: '#6366f1',
    borderBright: 'rgba(217, 70, 239, 0.22)',
  },
};

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

export default function HeroSection({ activeMode, setActiveMode, onHoverChange, onHeroTextComplete, isHeroTextComplete = false }: HeroSectionProps) {
  const isFirstRender = useRef(true);

  // Demo State Machine: mockDemo -> sandboxReady -> sandboxActive
  const [demoState, setDemoState] = useState<DemoState>('awaitingUrl');
  const [demoStep, setDemoStep] = useState<DemoStep>('chooseMode');

  const [headline1, setHeadline1] = useState('');
  const [headline2, setHeadline2] = useState('');
  const [descText, setDescText] = useState('');

  // Keep a stable ref to the callback to prevent the typewriter effect from re-running on parent updates
  const onHeroTextCompleteRef = useRef(onHeroTextComplete);
  useEffect(() => {
    onHeroTextCompleteRef.current = onHeroTextComplete;
  }, [onHeroTextComplete]);

  // Cinematic Word-by-Word Reveal for Headlines
  useEffect(() => {
    let active = true;
    const txt1Words = ["The", "visual", "website", "feedback", "tool"];
    const txt2Words = ["built", "for", "product", "teams."];

    let w1 = 0;
    let w2 = 0;

    const showWord1 = () => {
      if (!active) return;
      if (w1 < txt1Words.length) {
        setHeadline1(txt1Words.slice(0, w1 + 1).join(' '));
        w1++;
        setTimeout(showWord1, 500); // Decreased speed (500ms per word)
      } else {
        setTimeout(showWord2, 400);
      }
    };

    const showWord2 = () => {
      if (!active) return;
      if (w2 < txt2Words.length) {
        setHeadline2(txt2Words.slice(0, w2 + 1).join(' '));
        w2++;
        setTimeout(showWord2, 550); // Decreased speed (550ms per word)
      } else {
        // Pause for exactly 2 seconds before triggering the burst animation
        setTimeout(() => {
          if (active && onHeroTextCompleteRef.current) {
            onHeroTextCompleteRef.current();
          }
        }, 2000);
      }
    };

    // Wait exactly 2 seconds (2000ms) after page load before starting typing
    const delayStartTimer = setTimeout(() => {
      if (active) {
        showWord1();
      }
    }, 2000);

    return () => {
      active = false;
      clearTimeout(delayStartTimer);
    };
  }, []);

  // Typewriter effect for Description (txt3) after burst transition settles
  useEffect(() => {
    if (!isHeroTextComplete) return;

    let active = true;
    const txt3 = "Instantly share secure, interactive review links to collect visual feedback, annotations, and QA bug reports directly on live web pages. The fastest way to sign off website changes.";

    // Natural human typing delays per character
    const getDelay = (char: string, nextChar: string): number => {
      // Long pause after sentence-ending punctuation
      if (char === '.' || char === '!') return 220;
      // Medium pause after commas
      if (char === ',') return 80;
      // Short pause after other punctuation
      if (char === ';' || char === ':') return 60;
      // Pause before capital letter following a space (new phrase burst)
      if (char === ' ' && nextChar && /[A-Z]/.test(nextChar)) return 45;
      // Natural spacing between words
      if (char === ' ') return 25;
      // Occasional micro-hesitations to feel human
      if (Math.random() < 0.03) return 35 + Math.random() * 20;
      return 12 + Math.random() * 8; // Cruising speed: 12-20ms
    };

    let k = 0;
    const typeTxt3 = () => {
      if (!active) return;
      if (k < txt3.length) {
        setDescText(txt3.slice(0, k + 1));
        const currentChar = txt3[k];
        const nextChar = txt3[k + 1] ?? '';
        const delay = getDelay(currentChar, nextChar);
        k++;
        setTimeout(typeTxt3, delay);
      }
    };

    // Wait 1500ms for the fly-up burst spring to settle before starting description typing
    const delayTimer = setTimeout(() => {
      if (active) {
        typeTxt3();
      }
    }, 1500);

    return () => {
      active = false;
      clearTimeout(delayTimer);
    };
  }, [isHeroTextComplete]);


  // Smooth scroll window to top when burst animation completes, but only if the user hasn't scrolled past the hero section
  useEffect(() => {
    if (isHeroTextComplete) {
      // If the scroll position is less than 300px, they are still in the Hero Section area
      if (window.scrollY < 300) {
        const scrollTimer = setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }, 350); // Scroll as the slide-up settles
        return () => clearTimeout(scrollTimer);
      }
    }
  }, [isHeroTextComplete]);

  const textContainerVariants = {
    collapsed: {
      y: '210px',
      scale: 0.82,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    },
    burst: {
      y: '0px',
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 65,
        damping: 15,
        mass: 0.85
      }
    }
  };

  const headlineColorVariants = {
    collapsed: { color: '#f8fafc' },
    burst: { color: '#1D264F', transition: { duration: 0.6 } }
  };

  const descColorVariants = {
    collapsed: { color: '#cbd5e1' },
    burst: { color: '#4B5563', transition: { duration: 0.6 } }
  };

  const badgeVariants = {
    collapsed: {
      borderColor: 'rgba(255, 255, 255, 0.15)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#f1f5f9'
    },
    burst: {
      borderColor: '#E2F3F5',
      backgroundColor: 'rgba(226, 243, 245, 0.6)',
      color: '#253B80',
      transition: { duration: 0.5 }
    }
  };

  const ctasVariants = {
    collapsed: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      pointerEvents: 'none' as const
    },
    burst: {
      opacity: 1,
      y: 0,
      scale: 1,
      pointerEvents: 'auto' as const,
      transition: {
        type: 'spring' as const,
        stiffness: 65,
        damping: 16,
        delay: 0.18
      }
    }
  };

  const sandboxVariants = {
    collapsed: {
      y: '-390px',
      scale: 1.03,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    },
    burst: {
      y: '0px',
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 65,
        damping: 15,
        mass: 0.85
      }
    }
  };

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
    if (isInteractive || demoState === 'awaitingUrl') return;

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

  // Framer Motion variants for stagger entry
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 70,
        damping: 15
      }
    }
  };

  return (
    <section id="hero-section" className="relative min-h-screen pt-36 pb-28 flex flex-col justify-start overflow-hidden bg-transparent dot-grid">
      {/* Ambient 3D Parallax Background — z-0, pointer-events-none */}
      <AmbientParallaxBackground variant="full" />


      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex-1 flex flex-col justify-start gap-12 relative z-10">
        
        {/* Rebuilt Centered Hero Stack with Spring Stagger */}
        {/* Rebuilt Centered Hero Stack with Spring Stagger */}
        {isHeroTextComplete ? (
          <motion.div 
            layoutId="hero-text-stack"
            transition={{
              type: 'spring',
              stiffness: 45,
              damping: 12,
              mass: 0.9
            }}
            className="flex flex-col items-center text-center space-y-7 max-w-5xl mx-auto pt-8 md:pt-12 relative z-30"
          >

            {/* Headline */}
            <motion.h1 
              layoutId="hero-headline"
              className="font-display text-5xl sm:text-6xl lg:text-[5.75rem] font-black tracking-[-0.035em] text-pm-text leading-[0.98] transition-all duration-500 min-h-[2.1em] text-center"
            >
              {headline1}
              {headline1.length > 0 && headline1.length < 25 && (
                <span className="inline-block w-[6px] h-[0.85em] bg-pm-text ml-1.5 align-middle animate-pulse" />
              )}
              {headline2.length > 0 && (
                <>
                  <br />
                  {headline2.startsWith("built for ") ? (
                    <>
                      built for <span className="text-pm-accent underline decoration-3 decoration-pm-surface-3 underline-offset-6">{headline2.slice(10)}</span>
                    </>
                  ) : (
                    headline2
                  )}
                  {headline2.length < 24 && (
                    <span className="inline-block w-[6px] h-[0.85em] bg-pm-accent ml-1.5 align-middle animate-pulse" />
                  )}
                </>
              )}
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p 
              className="text-sm md:text-base text-pm-muted leading-relaxed max-w-2xl font-sans min-h-[3.2em] text-center"
            >
              {descText}
              {descText.length > 0 && descText.length < 188 && (
                <span className="inline-block w-[3px] h-[0.95em] bg-pm-muted ml-1 align-middle animate-pulse" />
              )}
            </motion.p>

            {/* CTAs, Input, and Explainer Wrapper */}
            <motion.div
              variants={ctasVariants}
              initial="collapsed"
              animate={isHeroTextComplete ? "burst" : "collapsed"}
              className="flex flex-col items-center space-y-7 w-full"
            >
              {/* CTAs & Trust Cue */}
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex flex-wrap gap-4 justify-center items-center">
                  <Link
                    href="/register"
                    className="btn-primary-3d px-8 py-4 bg-pm-accent hover:bg-pm-accent-bright text-white rounded-full text-[12.5px] font-mono font-bold uppercase tracking-wider transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    Start Free Project
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      setDemoState('mockDemo');
                      setIsInteractive(false);
                      setCinematicStep(0);
                    }}
                    className="btn-secondary-3d px-8 py-4 bg-pm-surface hover:bg-pm-surface-2 text-pm-accent border border-pm-border rounded-full text-[12.5px] font-mono font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                  >
                    Watch Sandbox Demo
                  </button>
                </div>
                
                <p className="text-[10px] font-mono text-pm-text-faint/90 uppercase tracking-widest mt-1">
                  NO EXTENSION REQUIRED · FREE UNLIMITED CLIENT SESSIONS
                </p>
              </div>

              {/* Sleek URL Input */}
              <form
                onSubmit={handleUrlSubmit}
                className="flex items-center gap-2 max-w-lg w-full bg-pm-surface border border-pm-border p-2 rounded-full focus-within:border-pm-accent focus-within:ring-2 focus-within:ring-pm-accent/20 transition-all duration-300 shadow-sm focus-within:shadow-md"
              >
                <div className="flex items-center gap-2.5 flex-1 pl-3.5 text-pm-muted">
                  <Search className="w-4 h-4 text-pm-accent/60" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste URL (e.g. yoursite.com) to load live Sandbox..."
                    className="bg-transparent border-none outline-none text-xs text-pm-text w-full font-mono placeholder:text-pm-text-faint"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-secondary-3d px-6 py-2.5 bg-pm-accent hover:bg-pm-accent-bright disabled:bg-pm-surface-3 text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-full transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Load Sandbox'}
                </button>
              </form>

              {/* Micro Onboarding Explainer Box */}
              <div className="text-[10.5px] text-pm-muted leading-normal max-w-lg font-sans bg-pm-surface border border-pm-border p-4 rounded-2xl flex items-start gap-3 shadow-sm text-left">
                <div className="w-5 h-5 rounded-full bg-pm-accent-subtle flex items-center justify-center text-pm-accent flex-shrink-0">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-pm-accent block mb-0.5 text-[11px] uppercase tracking-wider font-mono">
                    {isInteractive ? 'Active Sandbox Workspace' : 'Interactive Walkthrough'}
                  </span>
                  <p className="leading-relaxed text-[10.5px]">{modeExplainer[activeMode].hint}</p>
                </div>
              </div>
              {/* Trust Logos Row */}
              <div className="flex flex-col items-center gap-4 pt-6 w-full max-w-lg border-t border-pm-border/30">
                <span className="text-[9px] font-mono text-pm-text-muted/80 uppercase tracking-widest">
                  Trusted by designers & developers using
                </span>
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-50 grayscale contrast-125">
                  {/* Acme Logo */}
                  <div className="flex items-center gap-1 font-display text-[9.5px] font-black tracking-tight text-pm-text">
                    <div className="w-3.5 h-3.5 rounded-sm bg-[#1D264F] flex items-center justify-center text-white text-[7.5px]">A</div>
                    <span>ACME</span>
                  </div>
                  {/* Bolt */}
                  <div className="flex items-center gap-0.5 font-display text-[9.5px] font-bold tracking-tight text-pm-text">
                    <span className="text-yellow-600 font-extrabold text-[10px]">⚡</span>
                    <span>BOLT</span>
                  </div>
                  {/* Linear Style */}
                  <div className="flex items-center gap-1 font-display text-[9.5px] font-semibold tracking-wide text-pm-text">
                    <div className="w-3 h-3 rounded-full border border-pm-text flex items-center justify-center text-[5.5px] font-black">L</div>
                    <span>LINEAR</span>
                  </div>
                  {/* Vercel Style */}
                  <div className="flex items-center gap-1 font-display text-[9px] font-bold tracking-widest text-pm-text">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 75 65"><polygon points="37.5,0 75,65 0,65"/></svg>
                    <span>VERCEL</span>
                  </div>
                  {/* Stripe Style */}
                  <div className="flex items-center font-display text-[9.5px] font-extrabold tracking-tight text-pm-text">
                    <span>STRIPE</span>
                  </div>
                  {/* Figma Style */}
                  <div className="flex items-center gap-1 font-display text-[9.5px] font-semibold tracking-tight text-pm-text">
                    <svg className="w-2.5 h-3 fill-current" viewBox="0 0 24 36"><path d="M12 0c-3.3 0-6 2.7-6 6v6c0 3.3 2.7 6 6 6s6-2.7 6-6V6c0-3.3-2.7-6-6-6zm0 18c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm-6-6c0-3.3 2.7-6 6-6s6 2.7 6 6v6H6v-6z"/></svg>
                    <span>FIGMA</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="max-w-4xl mx-auto pt-8 md:pt-12 h-[340px] md:h-[400px] pointer-events-none" />
        )}

        {/* Sandbox Mockup Section with Dramatic Spacing and Spotlight framing */}
        <motion.div 
          initial="collapsed"
          animate={isHeroTextComplete ? "burst" : "collapsed"}
          variants={sandboxVariants}
          className="w-full max-w-5xl mx-auto mt-16 flex flex-col items-center space-y-6 relative z-10"
        >
          {/* Cinematic Theatrical Spotlight glow */}
          <div className="absolute -inset-16 bg-gradient-to-b from-pm-accent-glow via-transparent to-transparent rounded-[48px] blur-3xl pointer-events-none z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-pm-bg opacity-0 rounded-[32px] pointer-events-none z-0 shadow-[0_48px_96px_-24px_var(--pm-accent-glow)]" />
          
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#FCE2E1]/20 rounded-full blur-[90px] pointer-events-none z-0 animate-pulse duration-[7000ms]" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#C7B4D6]/20 rounded-full blur-[90px] pointer-events-none z-0 animate-pulse duration-[9000ms]" />
          
          {/* Guide strip explaining current step during mockDemo */}
          {demoState === 'mockDemo' && (
            <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 rounded-full bg-pm-surface border border-pm-border text-[9.5px] text-pm-muted font-sans shadow-sm animate-fade-in relative z-10">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-pm-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-pm-accent" />
                <Info className="w-3.5 h-3.5 text-pm-accent" />
                <span>Interactive Walkthrough Loop</span>
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-none max-w-full">
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
                      className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all duration-300 ${isActive ? 'bg-pm-accent text-white shadow-sm' : 'bg-pm-surface-2 text-pm-muted/60 border border-pm-border'}`}
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
            <div className="w-full max-w-3xl flex items-center justify-between gap-4 px-6 py-3.5 rounded-2xl bg-pm-accent-subtle border border-pm-border text-[10.5px] text-pm-accent font-sans animate-fade-in shadow-sm relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-pm-accent animate-ping" />
                <div>
                  <span className="font-bold">Walkthrough Complete!</span> Ready to test? Launch sandbox to drop custom pins.
                </div>
              </div>
              <button
                onClick={launchSandbox}
                className="px-5 py-2.5 bg-pm-accent hover:bg-pm-accent-bright rounded-full text-[9px] font-bold uppercase tracking-wider text-white cursor-pointer flex items-center gap-1.5 transition-all shadow-md"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Launch Sandbox</span>
              </button>
            </div>
          )}

          {/* Browser Mode Switcher above the preview */}
          <div className="flex items-center gap-1 p-1 bg-pm-surface border border-pm-border rounded-full shadow-sm">
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
                  className={`px-4.5 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${isSelected ? 'bg-pm-accent text-white font-extrabold shadow-sm' : 'text-pm-muted hover:text-pm-accent hover:bg-pm-surface-2'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Floating artistic feedback widgets framing the mockup */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.2 },
              x: { duration: 0.8, delay: 0.2 },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="hidden lg:flex absolute -left-12 top-[20%] z-20 items-center gap-2 px-3 py-2 bg-pm-surface border border-pm-border rounded-xl shadow-lg pointer-events-none select-none font-sans"
          >
            <div className="w-4 h-4 rounded bg-pm-accent-subtle flex items-center justify-center text-pm-accent">
              <MousePointer2 className="w-2.5 h-2.5 animate-pulse" />
            </div>
            <div className="text-[9.5px]">
              <span className="font-mono font-bold text-pm-text block leading-none">button.btn-cta</span>
              <span className="text-pm-accent text-[8px] font-semibold">Selector matched</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: [0, 10, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.3 },
              x: { duration: 0.8, delay: 0.3 },
              y: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="hidden lg:flex absolute -right-16 top-[35%] z-20 items-center gap-2.5 px-3.5 py-2.5 bg-pm-surface border border-pm-border rounded-xl shadow-lg pointer-events-none select-none font-sans"
          >
            <span className="w-2 h-2 rounded-full bg-pm-accent animate-pulse" />
            <div className="text-[9.5px]">
              <span className="font-bold text-pm-accent block leading-none">"Visual alignment issue"</span>
              <span className="text-pm-muted text-[8px]">Client pin added</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20, y: -20 }}
            animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.4 },
              x: { duration: 0.8, delay: 0.4 },
              y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="hidden lg:flex absolute -left-16 bottom-[25%] z-20 items-center gap-2 px-3 py-2 bg-pm-surface border border-pm-border rounded-xl shadow-lg pointer-events-none select-none font-sans"
          >
            <div className="w-4 h-4 rounded bg-pm-accent-subtle flex items-center justify-center text-pm-accent">
              <Layers className="w-2.5 h-2.5" />
            </div>
            <div className="text-[9.5px]">
              <span className="font-mono font-bold text-pm-text block leading-none">Safari v17.4</span>
              <span className="font-mono text-pm-accent text-[8px] font-semibold font-mono">macOS Sonoma</span>
            </div>
          </motion.div>

          {/* Mockup Browser Container */}
          <div className="relative w-full rounded-[32px] border border-pm-border bg-pm-surface/65 p-3 md:p-4 backdrop-blur-md shadow-[0_30px_80px_-20px_rgba(37,59,128,0.08)]">
            <motion.div 
              style={{
                rotateX: previewRotateX,
                rotateY: previewRotateY,
                transformStyle: 'preserve-3d',
                '--color-pm-accent': modeColors[activeMode].accent,
                '--color-pm-accent-bright': modeColors[activeMode].bright,
                '--color-pm-accent-vivid': modeColors[activeMode].vivid,
                '--pm-accent': modeColors[activeMode].accent,
                '--pm-accent-bright': modeColors[activeMode].bright,
                '--pm-accent-vivid': modeColors[activeMode].vivid,
                '--pm-accent-glow': modeColors[activeMode].glow,
                '--pm-accent-subtle': modeColors[activeMode].subtle,
                '--pm-accent-mid': modeColors[activeMode].mid,
                '--pm-cyan': modeColors[activeMode].gradientEnd,
                '--pm-border-bright': modeColors[activeMode].borderBright,
              } as any}
              onMouseMove={handlePreviewMouseMove}
              onMouseLeave={handlePreviewMouseLeave}
              onMouseEnter={handlePreviewMouseEnter}
              className="mockup-browser relative w-full aspect-[16/10] rounded-[24px] border border-white/10 bg-[#09090b] overflow-hidden shadow-[0_32px_80px_-20px_rgba(37,59,128,0.45)] transition-all duration-500"
            >
              {/* Animated glass glow outline */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#253B80]/40 via-[#3B82F6]/30 to-[#C7B4D6]/40 rounded-[24px] opacity-70 pointer-events-none z-30" />
            
              {/* Browser Header Bar */}
              <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/5 bg-[#09090d] flex items-center px-4 justify-between z-20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                  <div className="w-2 h-2 rounded-full bg-green-500/40" />
                </div>
                
                <div className="px-4 py-1 bg-black/45 border border-white/5 rounded-md text-[10px] font-mono text-slate-400 w-1/2 text-center select-none truncate">
                  {isLoading ? 'Connecting Sandbox...' : activeMode === 'spa' ? `${currentUrl}${spaTab === 'explore' ? '/explore' : spaTab === 'settings' ? '/settings' : ''}` : currentUrl}
                </div>
                
                <div className="w-24 flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setActivePin(null); setDrawerOpen(false); }}
                    className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
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
                className="absolute inset-0 pt-10 bg-[#070709] font-sans z-0 select-none overflow-hidden cursor-pointer"
              >
                {/* Scanlines / CRT filter effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.005)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none" />



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
                  ) : demoState === 'awaitingUrl' ? (
                    // Dormant State before loading
                    <motion.div
                      key="awaiting-url"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full flex flex-col items-center justify-center space-y-6 bg-[#070709] p-8 text-center relative"
                    >
                      {!isHeroTextComplete ? (
                        // Render Stack 2 (Inside mockup browser viewport)
                        <motion.div 
                          layoutId="hero-text-stack"
                          transition={{
                            type: 'spring',
                            stiffness: 45,
                            damping: 12,
                            mass: 0.9
                          }}
                          className="absolute inset-0 pt-12 sm:pt-20 px-6 sm:px-8 flex flex-col items-center justify-start text-center bg-[#070709] z-20 space-y-5 sm:space-y-6 select-none pointer-events-none"
                        >

                          {/* Headline */}
                          <motion.h1 
                            layoutId="hero-headline"
                            className="font-display text-2xl sm:text-3xl lg:text-[2.6rem] font-black tracking-[-0.03em] text-white leading-tight text-center min-h-[2.5em]"
                          >
                            {headline1}
                            {headline1.length > 0 && headline1.length < 25 && (
                              <span className="inline-block w-[4px] h-[0.85em] bg-white ml-1 align-middle animate-pulse" />
                            )}
                            {headline2.length > 0 && (
                              <>
                                <br />
                                {headline2.startsWith("built for ") ? (
                                  <>
                                    built for <span className="text-[#3B82F6] underline decoration-3 decoration-amber-400 underline-offset-4">{headline2.slice(10)}</span>
                                  </>
                                ) : (
                                  headline2
                                )}
                                {headline2.length < 24 && (
                                  <span className="inline-block w-[4px] h-[0.85em] bg-[#3B82F6] ml-1 align-middle animate-pulse" />
                                )}
                              </>
                            )}
                          </motion.h1>

                          {/* Supporting Copy */}
                          <motion.p 
                            className="text-[10px] sm:text-xs text-slate-300 leading-relaxed max-w-lg font-sans text-center"
                          >
                            {descText}
                            {descText.length > 0 && descText.length < 188 && (
                              <span className="inline-block w-[2px] h-[0.95em] bg-slate-300 ml-1 align-middle animate-pulse" />
                            )}
                          </motion.p>
                        </motion.div>
                      ) : (
                        // Normal awaiting URL card details
                        <>
                          <div className="w-16 h-16 rounded-3xl bg-[#253B80]/15 border border-[#253B80]/35 flex items-center justify-center text-white relative shadow-[0_0_20px_rgba(37,59,128,0.2)]">
                            <Globe className="w-7 h-7" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border border-[#070709] animate-pulse" />
                          </div>
                          
                          <div className="space-y-2 max-w-sm">
                            <h3 className="font-display text-lg font-bold text-white tracking-tight leading-snug">
                              Visual QA Sandbox
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans">
                              Enter a live website URL above and click <span className="font-bold text-white font-mono">Load Sandbox</span> to start dropping precision feedback pins.
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDemoState('mockDemo');
                                setIsInteractive(false);
                                setCinematicStep(0);
                              }}
                              className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Play className="w-3 h-3 fill-slate-300" />
                              <span>Watch Walkthrough Demo</span>
                            </button>
                          </div>
                        </>
                      )}
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
                              className="font-sans text-xs font-bold text-pm-text hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2"
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
                            className={`text-xl md:text-2xl font-sans font-bold text-white tracking-tight leading-tight hover:outline hover:outline-pm-accent-bright/50 hover:outline-1 hover:outline-offset-2 transition-all ${hoveredElement === 'heading' ? 'outline outline-pm-accent-bright/50 outline-1 outline-offset-2 bg-pm-accent/5' : ''}`}
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
                                  <h4 className="text-[9px] text-white font-bold font-sans">Dashboard Home</h4>
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
                                  <h4 className="text-[9px] text-white font-bold font-sans">Explore Content Feed</h4>
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
                                  <h4 className="text-[9px] text-white font-bold font-sans">Settings Pane</h4>
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
                        <span className="font-sans font-bold text-[10px] text-white">LEAVE FEEDBACK</span>
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
                      <h3 className="font-sans text-xl font-bold text-white tracking-tight leading-tight">
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
        </motion.div>

        {/* Horizontal Walkthrough Workflow Strip */}
        <div
          className="mkt-hero-walkthrough-strip py-8 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left mt-6"
        >
          {onboardingSteps.map((step) => (
            <div key={step.num} className="flex gap-3.5 items-start p-1">
              <span className="mkt-hero-walkthrough-num w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                {step.num}
              </span>
              <div className="space-y-0.5">
                <h4
                  className="mkt-hero-walkthrough-title font-display font-bold uppercase tracking-wider text-[10px] text-white"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {step.title}
                </h4>
                <p className="mkt-hero-walkthrough-desc text-[9px] text-pm-muted leading-relaxed" style={{ lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lower Layout: 5 Capability Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          {systems.map((sys) => {
            const isActive = activeMode === sys.id;
            return (
              <motion.div
                key={sys.id}
                onMouseEnter={() => { if (!isLoading) setActiveMode(sys.id); }}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                onClick={() => { if (!isLoading) setActiveMode(sys.id); }}
                data-active={isActive}
                data-accent={sys.id}
                className={`mkt-hero-capability-card relative p-5 rounded-2xl text-left cursor-pointer overflow-hidden group border border-pm-border bg-pm-surface/30 transition-all duration-300 ${sys.border} ${isActive ? `${sys.glow} border-pm-accent/50 bg-pm-surface-2/40` : ''}`}
              >
                {/* Hover glow background */}
                <div className="mkt-hero-card-glow absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

                {/* Active left border accent */}
                {isActive && (
                  <div className="mkt-hero-card-left-border absolute left-0 top-3 bottom-3 w-[2px] rounded-full" />
                )}

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className={`mkt-hero-card-icon-wrapper w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 bg-pm-surface-2 border border-pm-border text-pm-accent`}>
                    <sys.icon className="w-4 h-4" />
                  </div>
                  {isActive && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      className="mkt-hero-card-dot w-1.5 h-1.5 rounded-full"
                    />
                  )}
                </div>

                <div className="relative z-10 space-y-1.5">
                  <h4 className="mkt-hero-card-title font-display font-bold uppercase tracking-widest transition-colors duration-300 text-[9.5px] text-white">
                    {sys.name}
                  </h4>
                  <p className="mkt-hero-card-desc text-[9px] text-pm-muted leading-relaxed font-sans" style={{ lineHeight: 1.65 }}>
                    {sys.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
