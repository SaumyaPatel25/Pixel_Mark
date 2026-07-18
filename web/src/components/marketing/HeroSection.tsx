'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Zap, MousePointer2, Search, RefreshCw, Globe, Box, Grid, Compass, HelpCircle, CheckCircle2, Layers, Info, Trash2, PlusCircle, Play } from 'lucide-react';
import FloatingHeroShape from '@/components/marketing/FloatingHeroShape';
import Link from 'next/link';
import { ModeType } from './HomeClient';
import SentinelHideAndSeek from '@/components/marketing/SentinelHideAndSeek';
import { useAuthStore } from '@/store/authStore';
import AmbientParallaxBackground from './AmbientParallaxBackground';
import DarkHeroAura from './DarkHeroAura';
import ScrambleAuto from './ScrambleAuto';
import StorySandbox from './StorySandbox';

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

interface RandomHollowTextProps {
  text: string;
  isLightTheme: boolean;
  isHeroTextComplete: boolean;
  strokeColor: string;
  solidClassName?: string;
  fontClassName?: string;
  splitBy?: 'words' | 'chars';
}

const RandomHollowText = ({
  text,
  isLightTheme,
  isHeroTextComplete,
  strokeColor,
  solidClassName = 'text-pm-text',
  fontClassName = '',
  splitBy = 'words',
}: RandomHollowTextProps) => {
  const [hollowIndices, setHollowIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isLightTheme || !isHeroTextComplete) {
      setHollowIndices(new Set());
      return;
    }

    const items = (splitBy === 'words' ? text.split(' ') : text.split('')).filter(item => item !== '');

    const interval = setInterval(() => {
      const nextHollow = new Set<number>();
      for (let i = 0; i < items.length; i++) {
        if (items[i].trim() !== '' && Math.random() < 0.25) {
          nextHollow.add(i);
        }
      }
      setHollowIndices(nextHollow);
    }, 2000);

    return () => clearInterval(interval);
  }, [text, isLightTheme, isHeroTextComplete, splitBy]);

  if (!isLightTheme || !isHeroTextComplete) {
    return <span className={`${fontClassName} ${solidClassName}`}>{text}</span>;
  }

  const items = (splitBy === 'words' ? text.split(' ') : text.split('')).filter(item => item !== '');

  return (
    <span className={fontClassName}>
      {items.map((item, index) => {
        const isHollow = hollowIndices.has(index);
        
        return (
          <span
            key={index}
            className={`inline-block transition-all duration-700 ease-out ${
              isHollow ? 'text-transparent bg-none' : solidClassName
            }`}
            style={{
              WebkitTextStroke: isHollow ? `1.5px ${strokeColor}` : '1.5px transparent',
              marginRight: splitBy === 'words' && index < items.length - 1 ? '0.28em' : undefined,
            }}
          >
            {item}
          </span>
        );
      })}
    </span>
  );
};

export default function HeroSection({ activeMode, setActiveMode, onHoverChange, onHeroTextComplete, isHeroTextComplete = false }: HeroSectionProps) {
  const isFirstRender = useRef(true);

  // Demo State Machine: mockDemo -> sandboxReady -> sandboxActive
  const [demoState, setDemoState] = useState<DemoState>('awaitingUrl');
  const [demoStep, setDemoStep] = useState<DemoStep>('chooseMode');

  const [headline1, setHeadline1] = useState('The visual website feedback tool');
  const [headline2, setHeadline2] = useState('built for product teams.');
  const [descText, setDescText] = useState('');
  const [isLightTheme, setIsLightTheme] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkTheme = () => {
      setIsLightTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Keep a stable ref to the callback to prevent the typewriter effect from re-running on parent updates
  const onHeroTextCompleteRef = useRef(onHeroTextComplete);
  useEffect(() => {
    onHeroTextCompleteRef.current = onHeroTextComplete;
  }, [onHeroTextComplete]);


  // Description typewriter still runs after mount to give a subtle progressive feel

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
  }, [cinematicStep, isInteractive, demoState]);

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
    }, 150);

    setTimeout(() => {
      setLoadingText('Loading page content...');
    }, 300);

    setTimeout(() => {
      setIsLoading(false);
      setCurrentUrl(urlInput);
      setActiveMode('dom');
      setIsInteractive(true);
      setDemoState('sandboxActive');
    }, 450);
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
    <section id="hero-section" className="relative min-h-screen pt-36 pb-28 flex flex-col justify-start overflow-hidden bg-transparent dot-grid" style={{ isolation: 'isolate' }}>
      {/* Ambient 3D Parallax Background — z-0, pointer-events-none */}
      <AmbientParallaxBackground variant="full" />

      {/* Dark-theme-only hero aura / hover atmosphere */}
      <DarkHeroAura isDark={!isLightTheme} />


      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex-1 flex flex-col justify-start gap-12 relative z-10">
               
        {/* Rebuilt Centered Hero Stack — always visible, springs up on burst */}
        <motion.div 
          layoutId="hero-text-stack"
          initial="collapsed"
          animate={isHeroTextComplete ? "burst" : "collapsed"}
          variants={textContainerVariants}
          transition={{
            type: 'spring',
            stiffness: 45,
            damping: 12,
            mass: 0.9
          }}
          className="flex flex-col items-center text-center space-y-7 max-w-5xl mx-auto pt-8 md:pt-12 relative z-30"
        >
          {/* Headline Wrapper */}
          <div className="relative z-10 w-full max-w-full">
            {/* Base H1 */}
            <motion.h1 
              layoutId="hero-headline"
              className="font-display text-5xl sm:text-6xl lg:text-[5.75rem] font-black tracking-[-0.035em] text-pm-text leading-[0.98] transition-all duration-500 min-h-[2.1em] text-center relative z-10"
            >
              {headline1.includes("feedback") ? (
                <>
                  <RandomHollowText 
                    text={headline1.substring(0, headline1.indexOf("feedback"))} 
                    isLightTheme={isLightTheme} 
                    isHeroTextComplete={isHeroTextComplete} 
                    strokeColor="#6366f1" 
                    solidClassName="text-pm-text" 
                  />
                  <br />
                  <RandomHollowText 
                    text={headline1.substring(headline1.indexOf("feedback"))} 
                    isLightTheme={isLightTheme} 
                    isHeroTextComplete={isHeroTextComplete} 
                    strokeColor="#6366f1" 
                    solidClassName="text-pm-text" 
                  />
                </>
              ) : (
                <RandomHollowText 
                  text={headline1} 
                  isLightTheme={isLightTheme} 
                  isHeroTextComplete={isHeroTextComplete} 
                  strokeColor="#6366f1" 
                  solidClassName="text-pm-text" 
                />
              )}
              {headline1.length > 0 && headline1.length < 32 && (
                <span className="inline-block w-[6px] h-[0.85em] bg-pm-text ml-1.5 align-middle animate-pulse" />
              )}
              {headline2.length > 0 && (
                <>
                  <br />
                  {headline2.length <= 10 ? (
                    <RandomHollowText 
                      text={headline2} 
                      isLightTheme={isLightTheme} 
                      isHeroTextComplete={isHeroTextComplete} 
                      strokeColor="#6366f1" 
                      solidClassName="text-pm-text" 
                    />
                  ) : (
                    <>
                      <RandomHollowText 
                        text={headline2.substring(0, 10)} 
                        isLightTheme={isLightTheme} 
                        isHeroTextComplete={isHeroTextComplete} 
                        strokeColor="#6366f1" 
                        solidClassName="text-pm-text" 
                      />
                      <br />
                      {/* The Glassmorphic Capsule and Text (middle) */}
                      <motion.span
                        className={`relative z-10 inline-block transition-all duration-700 ${
                          isLightTheme && isHeroTextComplete
                            ? "bg-white/40 border border-blue-500/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.03)] px-5 py-1"
                            : "border border-transparent px-0 py-0"
                        }`}
                        animate={isLightTheme && isHeroTextComplete ? {
                          y: [0, -1.2, 0]
                        } : {}}
                        transition={{
                          y: { repeat: Infinity, duration: 4.6, ease: "easeInOut", delay: 0.3 }
                        }}
                      >
                        {isLightTheme ? (
                          <RandomHollowText
                            text={headline2.substring(10)}
                            isLightTheme={isLightTheme}
                            isHeroTextComplete={isHeroTextComplete}
                            strokeColor="#ec4899"
                            solidClassName="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600"
                            fontClassName="font-serif italic font-semibold"
                          />
                        ) : (
                          <ScrambleAuto
                            text={headline2.substring(10)}
                            isDark={true}
                            sweepDuration={1850}
                            pauseBetween={4300}
                            className="inline-block transition-all duration-700 font-serif italic font-semibold text-pm-accent"
                          />
                        )}
                      </motion.span>
                    </>
                  )}
                  {headline2.length < 24 && (
                    <span className="inline-block w-[6px] h-[0.85em] bg-pm-accent ml-1.5 align-middle animate-pulse" />
                  )}
                </>
              )}
            </motion.h1>
          </div>

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
                    
                    const sandboxEl = document.getElementById('hero-sandbox-demo');
                    if (sandboxEl) {
                      sandboxEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
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


        {/* Sandbox Mockup Section with Dramatic Spacing and Spotlight framing */}
        <div
          id="hero-sandbox-demo"
          className="w-full max-w-5xl mx-auto mt-16 flex flex-col items-center space-y-6 relative z-10"
        >
          {/* Cinematic Theatrical Spotlight glow */}
          <div className="absolute -inset-16 bg-gradient-to-b from-pm-accent-glow via-transparent to-transparent rounded-[48px] blur-3xl pointer-events-none z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-pm-bg opacity-0 rounded-[32px] pointer-events-none z-0 shadow-[0_48px_96px_-24px_var(--pm-accent-glow)]" />
          
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#FCE2E1]/20 rounded-full blur-[90px] pointer-events-none z-0 animate-pulse duration-[7000ms]" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#C7B4D6]/20 rounded-full blur-[90px] pointer-events-none z-0 animate-pulse duration-[9000ms]" />
          
          <StorySandbox />
        </div>

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
                  className="mkt-hero-walkthrough-title font-display font-bold uppercase tracking-wider text-[10px]"
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
                  <h4 className="mkt-hero-card-title font-display font-bold uppercase tracking-widest transition-colors duration-300 text-[9.5px]">
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
