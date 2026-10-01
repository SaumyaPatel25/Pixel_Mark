'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Globe, Check, 
  Smartphone, Monitor, MessageSquare, CheckCircle2, 
  ChevronDown, Lock, Play, Pause, Volume2, VolumeX, RotateCcw, MousePointerClick
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ModeType } from './HomeClient';
import { useAuthStore } from '@/store/authStore';

interface HeroSectionProps {
  activeMode?: ModeType;
  setActiveMode?: (mode: ModeType) => void;
  isHeroTextComplete?: boolean;
}

interface SandboxPin {
  id: number;
  x: number;
  y: number;
  selector: string;
  comment: string;
  isBug: boolean;
  status: 'open' | 'fixed';
}

/**
 * Kinetic Slashed Headline Term (Top 1% Editorial Motion Design)
 * Multi-layer Choreography:
 * - Floating badge positioned cleanly ABOVE the text with zero letterform overlap
 * - High-contrast crisp typography in dark & light themes (opacity: 0.85)
 * - Calibrated SVG slash bounds with zero stray overhangs
 * - Interactive: Click to replay sequence anytime
 */
function KineticSlashedTerm() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <span
      key={replayKey}
      onClick={() => setReplayKey((k) => k + 1)}
      className="relative block sm:inline-block whitespace-nowrap mt-2 sm:mt-0 cursor-pointer select-none group/slash align-baseline"
      title="Click to replay slash animation"
    >
      {/* Floating Micro-Badge - Positioned safely ABOVE the text without overlapping letterforms */}
      <motion.span
        initial={{ scale: 0, opacity: 0, y: 8, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0, rotate: -3 }}
        whileHover={{ scale: 1.08, rotate: -1, y: -2 }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 16,
          delay: 0.85,
        }}
        className="absolute -top-7 sm:-top-8.5 right-0 pointer-events-none z-20 select-none"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF527B] text-white text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm border border-white/20 dark:border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>never again</span>
        </span>
      </motion.span>

      {/* Slashed Headline Text with #7C97FF Color & Subtle Physical Recoil */}
      <motion.span
        initial={{ opacity: 1 }}
        animate={{
          opacity: 0.9,
          y: [0, -1, 2, -0.5, 0],
          rotate: [0, 0.4, -1, 0.3, 0],
        }}
        transition={{
          opacity: { duration: 0.35, delay: 0.65 },
          y: { duration: 0.35, delay: 0.6, times: [0, 0.25, 0.55, 0.8, 1] },
          rotate: { duration: 0.35, delay: 0.6, times: [0, 0.25, 0.55, 0.8, 1] },
        }}
        className="font-serif italic font-normal text-[#2B4CFF] dark:text-[#7C97FF] relative z-0 inline-block tracking-tight"
      >
        not in screenshots.
      </motion.span>

      {/* Dense Paint Brush Slash (Completely Covers All Words Especially 'screenshots.') */}
      <svg
        className="absolute -left-[4%] top-1/2 -translate-y-1/2 w-[110%] h-[150%] pointer-events-none z-10 overflow-visible"
        viewBox="0 0 360 40"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="paintbrush-pink-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF7597" />
            <stop offset="40%" stopColor="#FF527B" />
            <stop offset="75%" stopColor="#E8615A" />
            <stop offset="100%" stopColor="#FF3366" />
          </linearGradient>

          {/* Paint Brush Edge Softness & Depth */}
          <filter id="paintbrush-glow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#FF527B" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Base Dense Acrylic Paint Body (Thick 14px core covering full x-height from 'not' through 'screenshots.') */}
        <motion.path
          d="M 4 25 C 100 23, 240 20, 356 18"
          stroke="url(#paintbrush-pink-grad)"
          className="stroke-[#FF527B] dark:stroke-[#FF7597]"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#paintbrush-glow)"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.95 }}
          transition={{
            pathLength: { duration: 0.38, delay: 0.55, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.08, delay: 0.55 },
          }}
        />

        {/* 2. Core Saturated Paint Fill (Reinforces dense pigment across the full width) */}
        <motion.path
          d="M 8 22 C 110 22, 250 21, 352 21"
          stroke="url(#paintbrush-pink-grad)"
          className="stroke-[#FF527B] dark:stroke-[#FF7597]"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.98 }}
          transition={{
            pathLength: { duration: 0.35, delay: 0.57, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.08, delay: 0.57 },
          }}
        />

        {/* 3. Top Dry-Brush Bristle Streak (Authentic painterly texture across all letters) */}
        <motion.path
          d="M 12 17 C 115 17, 245 15, 348 14"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeOpacity="0.45"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.45 }}
          transition={{
            pathLength: { duration: 0.32, delay: 0.62, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.08, delay: 0.62 },
          }}
        />

        {/* 4. Bottom Wet Paint Bristle Edge (Ensures bottom of 'screenshots' is solidly covered) */}
        <motion.path
          d="M 10 28 C 120 26, 260 24, 350 23"
          stroke="url(#paintbrush-pink-grad)"
          className="stroke-[#FF527B] dark:stroke-[#FF7597]"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{
            pathLength: { duration: 0.3, delay: 0.66, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.08, delay: 0.66 },
          }}
        />
      </svg>
    </span>
  );
}

export default function HeroSection({
  isHeroTextComplete = false,
}: HeroSectionProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Quick Start URL State
  const [siteUrl, setSiteUrl] = useState('');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [sandboxMode, setSandboxMode] = useState<'comment' | 'browse'>('comment');
  
  // Teaser Video vs Sandbox Switcher
  const [previewTab, setPreviewTab] = useState<'video' | 'sandbox'>('video');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Interactive Live Demo Pins State
  const [pins, setPins] = useState<SandboxPin[]>([
    {
      id: 1,
      x: 58,
      y: 46,
      selector: 'button.cta-primary',
      comment: 'Button font weight should be 600, and padding feels a bit tight on mobile.',
      isBug: true,
      status: 'open',
    },
  ]);

  const [activePinId, setActivePinId] = useState<number | null>(1);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number; selector: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isBugDraft, setIsBugDraft] = useState(false);
  const [hasJustPosted, setHasJustPosted] = useState(false);

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  // Handle Quick Start URL submission
  const handleQuickStart = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = siteUrl.trim();
    if (!cleanUrl) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/register');
      }
      return;
    }

    let normalized = cleanUrl;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    if (user) {
      router.push(`/sessions?create=true&url=${encodeURIComponent(normalized)}`);
    } else {
      router.push(`/register?redirect=${encodeURIComponent(`/sessions?create=true&url=${normalized}`)}`);
    }
  };

  // Canvas click to place a new pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sandboxMode !== 'comment') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const className = target.className && typeof target.className === 'string' ? target.className.split(' ')[0] : '';
    const selector = className ? `${tagName}.${className}` : tagName;

    setDraftPin({ x: xPct, y: yPct, selector });
    setActivePinId(null);
    setCommentText('');
    setIsBugDraft(false);
    setHasJustPosted(false);
  };

  const handlePostDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftPin || !commentText.trim()) return;

    const newPin: SandboxPin = {
      id: pins.length + 1,
      x: draftPin.x,
      y: draftPin.y,
      selector: draftPin.selector,
      comment: commentText.trim(),
      isBug: isBugDraft,
      status: 'open',
    };

    setPins([...pins, newPin]);
    setActivePinId(newPin.id);
    setDraftPin(null);
    setHasJustPosted(true);
    setTimeout(() => setHasJustPosted(false), 3500);
  };

  const togglePinStatus = (id: number) => {
    setPins(
      pins.map((p) =>
        p.id === id ? { ...p, status: p.status === 'open' ? 'fixed' : 'open' } : p
      )
    );
  };

  return (
    <section
      id="hero-section"
      className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-transparent"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 w-full flex flex-col items-center text-center relative z-10 space-y-10">
        
        {/* Eyebrow Pill Tag with Soft Pastel Wash */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#FCE7E4] dark:border-[#9E2A2B]/40 bg-[#FCE7E4]/70 dark:bg-[#9E2A2B]/20 text-[#9E2A2B] dark:text-[#FCE7E4] text-[11px] font-mono font-medium tracking-wide shadow-2xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8615A] animate-pulse" />
          <span>Visual website feedback</span>
        </motion.div>

        {/* Section 8.2 Exact Headline with Editorial Poise */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="space-y-5 max-w-4xl"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-[#16141A] dark:text-white leading-[1.05]">
            Get client feedback on the live page,{' '}
            <KineticSlashedTerm />
          </h1>

          {/* Section 8.2 Exact Sub-line */}
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed max-w-2xl mx-auto font-sans">
            Send one review link. Your client clicks where something is wrong and writes what they mean. You see the exact element and a screenshot. Nothing to install.
          </p>
        </motion.div>

        {/* High-Conversion URL Entry Bar with "Button-in-Button" Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-xl space-y-3"
        >
          <form
            onSubmit={handleQuickStart}
            className="flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 rounded-full bg-white dark:bg-[#18171E] border border-slate-200/80 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-[#2B4CFF]/30 focus-within:border-[#2B4CFF]/50 transition-all"
          >
            <div className="flex items-center gap-3 px-4 py-2 w-full flex-1">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter your website address (e.g. acme-studio.com)"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full bg-transparent text-sm text-[#16141A] dark:text-white placeholder:text-slate-400 outline-none font-sans"
              />
            </div>
            
            {/* Nested "Button-in-Button" CTA */}
            <button
              type="submit"
              className="group relative inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer whitespace-nowrap w-full sm:w-auto"
            >
              <span>Create a review link</span>
              <span className="w-6 h-6 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </form>

          {/* Under-bar reassurance & Teaser trigger */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 text-xs text-pm-muted pt-1">
            <span className="font-mono text-pm-text/90 font-medium">
              Free for one project. No card needed.
            </span>
            <span className="text-slate-300 dark:text-white/20">•</span>
            <button
              type="button"
              onClick={() => {
                setPreviewTab('video');
                restartVideo();
              }}
              className="inline-flex items-center gap-1.5 font-medium text-[#2B4CFF] hover:underline cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Watch 6-second teaser</span>
            </button>
            <span className="text-slate-300 dark:text-white/20">•</span>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1 font-medium hover:text-[#2B4CFF] transition-colors"
            >
              <span>See how it works</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        {/* ── DOUBLE-BEZEL SHOWCASE CONTAINER (TEASER VIDEO + INTERACTIVE SANDBOX) ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-5xl pt-4"
        >
          {/* Outer Bezel (Hardware Chassis Frame) */}
          <div className="p-2 sm:p-3 rounded-[2.25rem] bg-gradient-to-b from-slate-200/70 to-slate-200/30 dark:from-white/10 dark:to-white/5 border border-slate-300/50 dark:border-white/10 shadow-[0_24px_64px_rgba(20,18,24,0.06)] transition-all">
            
            {/* Inner Core (The Screen) */}
            <div className="rounded-[1.625rem] bg-white dark:bg-[#131217] border border-slate-200/70 dark:border-white/10 overflow-hidden text-left shadow-inner">
              
              {/* Browser Window Header Strip with Video / Sandbox Switcher */}
              <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-[#18171E] border-b border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                
                {/* Traffic Lights + Address Pill */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF8577] inline-block shadow-2xs" />
                    <span className="w-3 h-3 rounded-full bg-[#FFC56E] inline-block shadow-2xs" />
                    <span className="w-3 h-3 rounded-full bg-[#68D391] inline-block shadow-2xs" />
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-pm-muted shadow-2xs">
                    <Lock className="w-3 h-3 text-[#137333] dark:text-[#68D391]" />
                    <span className="text-[11px]">https://stage.app/live-preview</span>
                  </div>
                </div>

                {/* Center Switcher: Video Teaser vs Interactive Sandbox with Gliding Pill Motion */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 border border-slate-200 dark:border-white/10 relative">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('video')}
                      className={`relative px-3 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
                        previewTab === 'video'
                          ? 'text-white dark:text-[#16141A] font-bold'
                          : 'text-pm-muted hover:text-[#16141A] dark:hover:text-white'
                      }`}
                    >
                      {previewTab === 'video' && (
                        <motion.div
                          layoutId="hero-preview-tab-pill"
                          className="absolute inset-0 bg-[#16141A] dark:bg-white rounded-full -z-10 shadow-xs"
                          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                        />
                      )}
                      <Play className="w-3 h-3 fill-current" />
                      <span>Product Teaser</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('sandbox')}
                      className={`relative px-3 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
                        previewTab === 'sandbox'
                          ? 'text-white font-bold'
                          : 'text-pm-muted hover:text-[#16141A] dark:hover:text-white'
                      }`}
                    >
                      {previewTab === 'sandbox' && (
                        <motion.div
                          layoutId="hero-preview-tab-pill"
                          className="absolute inset-0 bg-[#2B4CFF] rounded-full -z-10 shadow-xs"
                          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                        />
                      )}
                      <MousePointerClick className="w-3 h-3" />
                      <span>Interactive Sandbox</span>
                    </button>
                  </div>
                </div>

                {/* Right controls: Context specific */}
                {previewTab === 'sandbox' ? (
                  <div className="flex items-center gap-2">
                    {/* Desktop / Mobile Switch */}
                    <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setDeviceView('desktop')}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all ${
                          deviceView === 'desktop'
                            ? 'bg-white dark:bg-white/15 text-[#16141A] dark:text-white font-bold shadow-xs'
                            : 'text-pm-muted hover:text-[#16141A]'
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span className="hidden sm:inline">Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeviceView('mobile')}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all ${
                          deviceView === 'mobile'
                            ? 'bg-white dark:bg-white/15 text-[#16141A] dark:text-white font-bold shadow-xs'
                            : 'text-pm-muted hover:text-[#16141A]'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span className="hidden sm:inline">Mobile</span>
                      </button>
                    </div>

                    {/* Mode Switch (Section 9) */}
                    <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setSandboxMode('browse')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                          sandboxMode === 'browse'
                            ? 'bg-white dark:bg-white/15 text-[#16141A] dark:text-white font-bold shadow-xs'
                            : 'text-pm-muted hover:text-[#16141A]'
                        }`}
                      >
                        Browse
                      </button>
                      <button
                        type="button"
                        onClick={() => setSandboxMode('comment')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                          sandboxMode === 'comment'
                            ? 'bg-[#2B4CFF] text-white font-bold shadow-xs'
                            : 'text-pm-muted hover:text-[#16141A]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Comment
                      </button>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-[#ECE6F6] dark:bg-[#4A154B]/30 border border-[#ECE6F6] dark:border-[#4A154B]/50 text-[11px] font-mono font-bold text-[#4A154B] dark:text-[#E8D9F7]">
                      Comments ({pins.length})
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleVideoPlay}
                      className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-pm-muted hover:text-[#16141A] dark:hover:text-white transition-colors"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <button
                      type="button"
                      onClick={restartVideo}
                      className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-pm-muted hover:text-[#16141A] dark:hover:text-white transition-colors"
                      title="Replay from start"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={toggleVideoMute}
                      className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-pm-muted hover:text-[#16141A] dark:hover:text-white transition-colors"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Viewport Display (Video Player or Interactive Sandbox) */}
              <div className="relative bg-[#FAF8F5]/80 dark:bg-[#0D0C0F]/60 overflow-hidden flex items-center justify-center">
                
                {/* ── TAB 1: PRODUCT TEASER VIDEO ── */}
                {previewTab === 'video' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full relative group cursor-pointer"
                    onClick={toggleVideoPlay}
                  >
                    <video
                      ref={videoRef}
                      src="/stage_teaser.mp4"
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      className="w-full h-auto max-h-[560px] object-cover block mx-auto select-none"
                    />

                    {/* Floating Overlay Hint on Hover */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="px-4 py-2 rounded-full bg-white/90 dark:bg-[#16141A]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-xs font-mono text-[#16141A] dark:text-white shadow-lg flex items-center gap-2">
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPlaying ? 'Click to pause' : 'Click to play'}</span>
                      </div>
                    </div>

                    {/* Bottom floating CTA to try the interactive sandbox */}
                    <div className="absolute bottom-4 right-4 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTab('sandbox');
                        }}
                        className="px-4 py-2 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] text-xs font-mono font-semibold flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <MousePointerClick className="w-3.5 h-3.5" />
                        <span>Try Interactive Demo</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── TAB 2: INTERACTIVE LIVE PIN SANDBOX ── */}
                {previewTab === 'sandbox' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-8 w-full min-h-[460px] flex items-center justify-center overflow-x-auto"
                  >
                    {/* Device Container Wrapper */}
                    <div
                      onClick={handleCanvasClick}
                      className={`relative bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm transition-all duration-300 overflow-hidden cursor-crosshair select-none ${
                        deviceView === 'mobile'
                          ? 'w-[360px] min-h-[420px] p-5'
                          : 'w-full max-w-4xl min-h-[380px] p-8'
                      }`}
                    >
                      {/* Mock Website Navbar */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#16141A] dark:bg-white text-white dark:text-[#16141A] flex items-center justify-center font-bold text-xs">
                            A
                          </div>
                          <span className="font-semibold text-sm text-[#16141A] dark:text-white">Acme Studio</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-pm-muted font-medium">
                          <span className="hover:text-[#16141A] transition-colors">Work</span>
                          <span className="hover:text-[#16141A] transition-colors">About</span>
                          <span className="px-2.5 py-1 rounded-full bg-[#EBF1FE] text-[#1A73E8] border border-[#D2E3FC] text-[11px] font-mono font-semibold">
                            Contact
                          </span>
                        </div>
                      </div>

                      {/* Mock Website Hero Content */}
                      <div className="space-y-4 max-w-lg">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#2B4CFF] font-semibold bg-[#2B4CFF]/10 px-2.5 py-0.5 rounded-full inline-block">
                          Client Review Preview · v2.4
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white tracking-tight leading-snug">
                          We engineer digital brands that command attention.
                        </h3>
                        <p className="text-xs sm:text-sm text-pm-muted leading-relaxed font-sans">
                          Designed for founders and forward-thinking teams. Every interface is tested on real staging URLs with zero friction.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            className="cta-primary px-4 py-2.5 rounded-xl bg-[#2B4CFF] text-white font-mono text-xs font-semibold shadow-sm hover:bg-[#203ECC] transition-colors"
                          >
                            Publish Changes
                          </button>
                          <button
                            type="button"
                            className="cta-secondary px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[#16141A] dark:text-white font-mono text-xs font-medium"
                          >
                            Our Philosophy
                          </button>
                        </div>
                      </div>

                      {/* Click-to-comment hint banner */}
                      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#18171E]/90 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-pm-muted shadow-xs flex items-center gap-1.5 pointer-events-none">
                        <MessageSquare className="w-3 h-3 text-[#2B4CFF]" />
                        <span>Click anywhere to pin a comment</span>
                      </div>

                      {/* ── RENDER PINNED COMMENTS ── */}
                      {pins.map((pin) => {
                        const isSelected = pin.id === activePinId;
                        const isFixed = pin.status === 'fixed';

                        return (
                          <div
                            key={pin.id}
                            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePinId(isSelected ? null : pin.id);
                                setDraftPin(null);
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all shadow-md cursor-pointer ${
                                isFixed
                                  ? 'bg-[#137333] text-white'
                                  : isSelected
                                  ? 'bg-[#2B4CFF] text-white ring-4 ring-[#2B4CFF]/30 scale-110'
                                  : 'bg-[#2B4CFF] text-white hover:scale-105'
                              }`}
                            >
                              {pin.id}
                            </button>

                            {/* Active Pin Popover Card */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.94, y: 6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.94, y: 6 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-9 left-1/2 -translate-x-1/2 w-64 p-3.5 rounded-2xl bg-white dark:bg-[#18171E] border border-slate-200/80 dark:border-white/10 shadow-xl text-left z-30 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between text-[10px] font-mono">
                                    <span className="font-bold text-[#16141A] dark:text-white">Pin #{pin.id}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                        isFixed
                                          ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                                          : 'bg-[#FCE7E4] text-[#9E2A2B] border border-[#FCE7E4]'
                                      }`}
                                    >
                                      {isFixed ? 'Fixed' : 'Open'}
                                    </span>
                                  </div>

                                  <p className="text-xs text-[#16141A] dark:text-slate-200 leading-relaxed font-sans">
                                    {pin.comment}
                                  </p>

                                  <div className="text-[10px] font-mono text-pm-muted truncate bg-slate-50 dark:bg-white/5 p-1.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                                    target: {pin.selector}
                                  </div>

                                  {/* Mark as Fixed / Reopen Toggle (Section 9) */}
                                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                                    <button
                                      type="button"
                                      onClick={() => togglePinStatus(pin.id)}
                                      className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                        isFixed
                                          ? 'text-pm-muted hover:text-[#16141A]'
                                          : 'bg-[#137333] text-white hover:bg-[#0f5c29]'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{isFixed ? 'Reopen' : 'Mark as Fixed'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setActivePinId(null)}
                                      className="text-[10px] text-pm-muted hover:text-[#16141A] font-mono"
                                    >
                                      Close
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      {/* ── DRAFT PIN COMPOSER POPOVER ── */}
                      <AnimatePresence>
                        {draftPin && (
                          <div
                            style={{ left: `${draftPin.x}%`, top: `${draftPin.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#2B4CFF] text-white flex items-center justify-center text-xs font-mono font-bold shadow-lg ring-4 ring-[#2B4CFF]/25">
                              {pins.length + 1}
                            </div>

                            <motion.div
                              initial={{ opacity: 0, scale: 0.94, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.94, y: 6 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-9 left-1/2 -translate-x-1/2 w-72 p-3.5 rounded-2xl bg-white dark:bg-[#18171E] border border-slate-200 dark:border-white/10 shadow-2xl text-left space-y-3"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-pm-muted">
                                <span className="font-semibold text-[#16141A] dark:text-white">New Pin #{pins.length + 1}</span>
                                <span className="truncate max-w-[120px] bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{draftPin.selector}</span>
                              </div>

                              <form onSubmit={handlePostDraft} className="space-y-2.5">
                                <textarea
                                  autoFocus
                                  rows={2}
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="What should change here?"
                                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-[#16141A] dark:text-white placeholder:text-slate-400 outline-none focus:border-[#2B4CFF] resize-none font-sans"
                                />

                                <div className="flex items-center justify-between pt-1">
                                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-pm-muted cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isBugDraft}
                                      onChange={(e) => setIsBugDraft(e.target.checked)}
                                      className="rounded text-[#2B4CFF] focus:ring-0"
                                    />
                                    <span>This is a bug</span>
                                  </label>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setDraftPin(null)}
                                      className="px-2 py-1 text-[11px] font-mono text-pm-muted hover:text-[#16141A]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={!commentText.trim()}
                                      className="px-3.5 py-1.5 rounded-lg bg-[#2B4CFF] hover:bg-[#203ecc] disabled:opacity-50 text-white font-mono text-xs font-semibold transition-all cursor-pointer shadow-xs"
                                    >
                                      Post comment
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>

                      {/* Toast confirmation after posting (Section 9) */}
                      <AnimatePresence>
                        {hasJustPosted && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-xs font-mono font-medium shadow-md z-40 flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Comment posted. Your team will see it on this exact spot.</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
