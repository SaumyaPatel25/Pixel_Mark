'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Globe, Check, AlertCircle, 
  Smartphone, Monitor, MessageSquare, CheckCircle2, 
  ChevronDown, RotateCcw, Lock, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModeType } from './HomeClient';
import { useAuthStore } from '@/store/authStore';

interface HeroSectionProps {
  activeMode: ModeType;
  setActiveMode: (mode: ModeType) => void;
  onHoverChange: (pos: { x: number; y: number } | null) => void;
  onHeroTextComplete?: () => void;
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

export default function HeroSection({
  activeMode,
  setActiveMode,
  onHoverChange,
  onHeroTextComplete,
  isHeroTextComplete = false,
}: HeroSectionProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Quick Start URL State
  const [siteUrl, setSiteUrl] = useState('');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [sandboxMode, setSandboxMode] = useState<'comment' | 'browse'>('comment');

  // Interactive Live Demo Pins State
  const [pins, setPins] = useState<SandboxPin[]>([
    {
      id: 1,
      x: 58,
      y: 42,
      selector: 'button.cta-primary',
      comment: 'Button font weight should be 600, and padding feels a bit tight.',
      isBug: true,
      status: 'open',
    },
  ]);

  const [activePinId, setActivePinId] = useState<number | null>(1);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number; selector: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isBugDraft, setIsBugDraft] = useState(false);
  const [hasJustPosted, setHasJustPosted] = useState(false);

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

    // Identify target element
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

  const activePin = pins.find((p) => p.id === activePinId);

  return (
    <section
      id="hero-section"
      className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-transparent"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 w-full flex flex-col items-center text-center relative z-10 space-y-10">
        
        {/* Top Minimal Category Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pm-border bg-pm-surface/80 text-pm-text text-[11px] font-mono font-medium tracking-wide shadow-xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-pm-accent animate-pulse" />
          <span>Visual website feedback</span>
        </motion.div>

        {/* Section 8.2 Exact Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="space-y-5 max-w-4xl"
        >
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.035em] text-pm-text leading-[1.04]">
            Get client feedback on the live page,{' '}
            <span className="text-pm-accent underline decoration-pm-accent/25 underline-offset-8">
              not in screenshots.
            </span>
          </h1>

          {/* Section 8.2 Exact Sub-line */}
          <p className="text-base sm:text-lg text-pm-muted leading-relaxed max-w-2xl mx-auto font-sans">
            Send one review link. Your client clicks where something is wrong and writes what they mean. You see the exact element and a screenshot. Nothing to install.
          </p>
        </motion.div>

        {/* High-Conversion URL Entry Bar & Direct Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-xl space-y-3"
        >
          <form
            onSubmit={handleQuickStart}
            className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-pm-surface border border-pm-border shadow-xl shadow-pm-accent/5 focus-within:border-pm-accent transition-all"
          >
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 w-full flex-1">
              <Globe className="w-4 h-4 text-pm-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter your website URL (e.g. acme-studio.com)"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full bg-transparent text-sm text-pm-text placeholder:text-pm-muted/60 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span>Create a review link</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Line Under Buttons & Secondary Action (Section 8.2) */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-pm-muted pt-1">
            <span className="font-mono text-pm-text/80 font-semibold">
              Free for one project. No card needed.
            </span>
            <span className="text-pm-border">•</span>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1 font-medium hover:text-pm-accent transition-colors"
            >
              <span>See how it works</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        {/* ── THE LIVE PIN SANDBOX PREVIEW (Top 1% Interactive UI) ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-5xl pt-4"
        >
          <div className="rounded-3xl border border-pm-border bg-pm-surface shadow-2xl shadow-pm-accent/5 overflow-hidden text-left transition-all">
            
            {/* Browser Window Header Strip */}
            <div className="px-4 py-3 bg-pm-surface-2 border-b border-pm-border flex flex-wrap items-center justify-between gap-3">
              
              {/* Traffic Lights + Address Pill */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-pm-surface border border-pm-border text-xs font-mono text-pm-muted shadow-2xs">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>https://acme-studio.com/preview</span>
                </div>
              </div>

              {/* Viewport & Mode Controls */}
              <div className="flex items-center gap-2">
                
                {/* Desktop / Mobile Switch */}
                <div className="flex items-center p-0.5 rounded-lg bg-pm-surface border border-pm-border">
                  <button
                    type="button"
                    onClick={() => setDeviceView('desktop')}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1 transition-colors ${
                      deviceView === 'desktop'
                        ? 'bg-pm-accent text-white font-bold'
                        : 'text-pm-muted hover:text-pm-text'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceView('mobile')}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1 transition-colors ${
                      deviceView === 'mobile'
                        ? 'bg-pm-accent text-white font-bold'
                        : 'text-pm-muted hover:text-pm-text'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                {/* Browse vs Comment Mode Switch (Section 9) */}
                <div className="flex items-center p-0.5 rounded-lg bg-pm-surface border border-pm-border">
                  <button
                    type="button"
                    onClick={() => setSandboxMode('browse')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                      sandboxMode === 'browse'
                        ? 'bg-pm-surface-2 text-pm-text font-bold'
                        : 'text-pm-muted hover:text-pm-text'
                    }`}
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    onClick={() => setSandboxMode('comment')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                      sandboxMode === 'comment'
                        ? 'bg-pm-accent text-white font-bold'
                        : 'text-pm-muted hover:text-pm-text'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Comment
                  </button>
                </div>

                {/* Comment Counter (Section 9) */}
                <div className="px-2.5 py-1 rounded-lg bg-pm-surface border border-pm-border text-[11px] font-mono font-bold text-pm-text">
                  Comments ({pins.length})
                </div>
              </div>
            </div>

            {/* Browser Viewport Area */}
            <div className="p-4 sm:p-8 bg-pm-bg/60 min-h-[460px] flex items-center justify-center overflow-x-auto relative">
              
              {/* Device Container Wrapper */}
              <div
                onClick={handleCanvasClick}
                className={`relative bg-pm-surface border border-pm-border rounded-2xl shadow-sm transition-all duration-300 overflow-hidden cursor-crosshair select-none ${
                  deviceView === 'mobile'
                    ? 'w-[360px] min-h-[420px] p-5'
                    : 'w-full max-w-4xl min-h-[380px] p-8'
                }`}
              >
                {/* Mock Website Navbar */}
                <div className="flex items-center justify-between border-b border-pm-border pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-pm-accent text-white flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <span className="font-display font-bold text-sm text-pm-text">Acme Studio</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-pm-muted">
                    <span className="hover:text-pm-text transition-colors">Work</span>
                    <span className="hover:text-pm-text transition-colors">About</span>
                    <span className="px-2.5 py-1 rounded-lg bg-pm-surface-2 border border-pm-border text-pm-text font-medium">
                      Contact
                    </span>
                  </div>
                </div>

                {/* Mock Website Hero Content */}
                <div className="space-y-4 max-w-lg">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-pm-accent font-bold">
                    Client Design Preview · v2.4
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-pm-text tracking-tight leading-snug">
                    We engineer digital brands that command attention.
                  </h3>
                  <p className="text-xs sm:text-sm text-pm-muted leading-relaxed">
                    Designed for founders and forward-thinking teams. Every interface is tested on real staging URLs with zero friction.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      className="cta-primary px-4 py-2.5 rounded-xl bg-pm-accent text-white font-mono text-xs font-bold shadow-sm"
                    >
                      View Portfolio
                    </button>
                    <button
                      type="button"
                      className="cta-secondary px-4 py-2.5 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-text font-mono text-xs font-medium"
                    >
                      Our Philosophy
                    </button>
                  </div>
                </div>

                {/* Click-to-comment hint banner */}
                <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-pm-surface-2/90 border border-pm-border text-[10px] font-mono text-pm-muted backdrop-blur-xs flex items-center gap-1.5 pointer-events-none">
                  <MessageSquare className="w-3 h-3 text-pm-accent" />
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
                            ? 'bg-slate-500 text-white'
                            : isSelected
                            ? 'bg-pm-accent text-white ring-4 ring-pm-accent/25 scale-110'
                            : 'bg-pm-accent text-white hover:scale-105'
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
                            className="absolute top-9 left-1/2 -translate-x-1/2 w-64 p-3.5 rounded-2xl bg-pm-surface border border-pm-border shadow-xl text-left z-30 space-y-2.5"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold text-pm-text">Pin #{pin.id}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  isFixed
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-pm-accent/10 text-pm-accent'
                                }`}
                              >
                                {isFixed ? 'Fixed' : 'Open'}
                              </span>
                            </div>

                            <p className="text-xs text-pm-text leading-relaxed">
                              {pin.comment}
                            </p>

                            <div className="text-[10px] font-mono text-pm-muted/70 truncate bg-pm-surface-2 p-1 rounded border border-pm-border/50">
                              target: {pin.selector}
                            </div>

                            {/* Mark as Fixed / Reopen Toggle (Section 9) */}
                            <div className="pt-1 flex items-center justify-between border-t border-pm-border">
                              <button
                                type="button"
                                onClick={() => togglePinStatus(pin.id)}
                                className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                  isFixed
                                    ? 'text-pm-muted hover:text-pm-text'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{isFixed ? 'Reopen' : 'Mark as Fixed'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActivePinId(null)}
                                className="text-[10px] text-pm-muted hover:text-pm-text font-mono"
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
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-mono font-bold shadow-lg ring-4 ring-emerald-500/25">
                        {pins.length + 1}
                      </div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 6 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-9 left-1/2 -translate-x-1/2 w-72 p-3.5 rounded-2xl bg-pm-surface border border-pm-border shadow-2xl text-left space-y-3"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-pm-muted">
                          <span>New Pin #{pins.length + 1}</span>
                          <span className="truncate max-w-[120px]">{draftPin.selector}</span>
                        </div>

                        <form onSubmit={handlePostDraft} className="space-y-2.5">
                          {/* Section 9 exact placeholder */}
                          <textarea
                            autoFocus
                            rows={2}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="What should change here?"
                            className="w-full p-2.5 rounded-xl bg-pm-surface-2 border border-pm-border text-xs text-pm-text placeholder:text-pm-muted/60 outline-none focus:border-pm-accent resize-none font-sans"
                          />

                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-[11px] font-mono text-pm-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isBugDraft}
                                onChange={(e) => setIsBugDraft(e.target.checked)}
                                className="rounded text-pm-accent focus:ring-0"
                              />
                              <span>This is a bug</span>
                            </label>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDraftPin(null)}
                                className="px-2.5 py-1 text-[11px] font-mono text-pm-muted hover:text-pm-text"
                              >
                                Cancel
                              </button>
                              {/* Section 9 exact button */}
                              <button
                                type="submit"
                                disabled={!commentText.trim()}
                                className="px-3 py-1.5 rounded-lg bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-50 text-white font-mono text-xs font-bold transition-all cursor-pointer"
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
                      className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-mono font-medium shadow-lg z-40 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Comment posted. Your team will see it on this exact spot.</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
