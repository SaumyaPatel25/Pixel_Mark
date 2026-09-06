'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

interface MarketingMotionBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'vibrant';
}

/**
 * Senior Motion Graphics Director - High-End Background Suite
 * 
 * Features:
 * 1. Multi-Plane Chromatic Aurora: Liquid floating plasma orbs with Lissajous harmonic drift.
 * 2. Precision Telemetry Matrix: Sub-pixel grid with radial falloff and glowing technical corner reticles.
 * 3. Living Radar Scanners: Laser sweep beams (both vertical & horizontal axis) representing active QA diagnostics.
 * 4. Undulating Parametric Vector Sine Waves: Dual flowing harmonic ribbons with animated gradient strokes.
 * 5. Floating HUD Telemetry & Constellation Micro-Nodes: Sub-pixel coordinates, pulsing rings, and status beacons.
 * 6. Interactive Cursor Spotlight: Damped spring physics responding organically to user pointer movement via useMotionTemplate.
 * 7. Dual-Theme Adaptive: Dynamic detection of 'dark' and 'light' theme with seamless crossfade.
 */
export default function MarketingMotionBackground({
  className = '',
  intensity = 'vibrant',
}: MarketingMotionBackgroundProps) {
  const [isDark, setIsDark] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mouse tracking with soft spring physics
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 28, stiffness: 45, mass: 1.2 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Spotlight position transforms
  const spotlightX = useTransform(smoothMouseX, [0, 1], ['0%', '100%']);
  const spotlightY = useTransform(smoothMouseY, [0, 1], ['0%', '100%']);

  // Dynamic spring-damped gradient templates
  const spotlightDark = useMotionTemplate`radial-gradient(600px circle at ${spotlightX} ${spotlightY}, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.08) 35%, transparent 70%)`;
  const spotlightLight = useMotionTemplate`radial-gradient(520px circle at ${spotlightX} ${spotlightY}, rgba(99, 102, 241, 0.1), rgba(59, 130, 246, 0.04) 40%, transparent 70%)`;

  // Parallax shifts for floating vector planes
  const plane1X = useTransform(smoothMouseX, [0, 1], [-18, 18]);
  const plane1Y = useTransform(smoothMouseY, [0, 1], [-18, 18]);
  const plane2X = useTransform(smoothMouseX, [0, 1], [14, -14]);
  const plane2Y = useTransform(smoothMouseY, [0, 1], [14, -14]);

  useEffect(() => {
    setIsMounted(true);

    // Detect reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    // Detect theme changes via data-theme attribute on <html>
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Track mouse pointer across the window
    const handlePointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      const xNorm = e.clientX / window.innerWidth;
      const yNorm = e.clientY / window.innerHeight;
      mouseX.set(Math.max(0, Math.min(1, xNorm)));
      mouseY.set(Math.max(0, Math.min(1, yNorm)));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      observer.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [reducedMotion, mouseX, mouseY]);

  // Telemetry nodes configuration
  const telemetryNodes = useMemo(() => [
    { id: 'hud-1', label: 'STAGE // PROXY_V3', x: '7%', y: '14%', delay: 0 },
    { id: 'hud-2', label: '0.01px SUB-PIXEL', x: '88%', y: '18%', delay: 1.2 },
    { id: 'hud-3', label: 'RAYCAST: [0.82, 0.44]', x: '10%', y: '72%', delay: 2.4 },
    { id: 'hud-4', label: 'DOM_INTEGRITY: 100%', x: '85%', y: '78%', delay: 0.8 },
  ], []);

  // Aurora orb configurations
  const orbs = useMemo(() => [
    {
      id: 'orb-indigo',
      className: isDark
        ? 'from-indigo-600/25 via-indigo-500/15 to-transparent'
        : 'from-indigo-500/12 via-indigo-400/06 to-transparent',
      size: 'w-[45rem] h-[45rem]',
      initial: { x: '-10%', y: '-5%' },
      animate: reducedMotion ? {} : {
        x: ['-10%', '15%', '-5%', '-10%'],
        y: ['-5%', '20%', '8%', '-5%'],
        scale: [1, 1.1, 0.95, 1],
      },
      duration: 24,
    },
    {
      id: 'orb-cyan',
      className: isDark
        ? 'from-cyan-500/20 via-sky-500/12 to-transparent'
        : 'from-cyan-400/10 via-sky-300/05 to-transparent',
      size: 'w-[40rem] h-[40rem]',
      initial: { x: '65%', y: '5%' },
      animate: reducedMotion ? {} : {
        x: ['65%', '45%', '70%', '65%'],
        y: ['5%', '25%', '-5%', '5%'],
        scale: [1, 0.92, 1.08, 1],
      },
      duration: 28,
    },
    {
      id: 'orb-purple',
      className: isDark
        ? 'from-purple-600/20 via-fuchsia-600/10 to-transparent'
        : 'from-purple-400/10 via-fuchsia-300/05 to-transparent',
      size: 'w-[38rem] h-[38rem]',
      initial: { x: '10%', y: '55%' },
      animate: reducedMotion ? {} : {
        x: ['10%', '30%', '5%', '10%'],
        y: ['55%', '40%', '65%', '55%'],
        scale: [1, 1.05, 0.92, 1],
      },
      duration: 26,
    },
    {
      id: 'orb-emerald',
      className: isDark
        ? 'from-emerald-500/15 via-teal-500/08 to-transparent'
        : 'from-emerald-400/08 via-teal-300/04 to-transparent',
      size: 'w-[35rem] h-[35rem]',
      initial: { x: '70%', y: '60%' },
      animate: reducedMotion ? {} : {
        x: ['70%', '55%', '75%', '70%'],
        y: ['60%', '75%', '50%', '60%'],
        scale: [1, 1.12, 0.96, 1],
      },
      duration: 32,
    },
  ], [isDark, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700 ${className}`}
      style={{ opacity: isMounted ? 1 : 0 }}
    >
      {/* ============================================================ */}
      {/* LAYER 1: Deep Chromatic Aurora / Atmospheric Fluid Orbs      */}
      {/* ============================================================ */}
      <div className="absolute inset-0 filter blur-[90px] sm:blur-[120px] will-change-transform">
        {orbs.map((orb) => (
          <motion.div
            key={orb.id}
            initial={orb.initial}
            animate={orb.animate}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute rounded-full bg-gradient-to-tr ${orb.className} ${orb.size}`}
            style={{
              mixBlendMode: isDark ? 'screen' : 'multiply',
            }}
          />
        ))}
      </div>

      {/* ============================================================ */}
      {/* LAYER 2: Precision Matrix & Sub-Pixel Technical Grid         */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0 opacity-[0.45] dark:opacity-[0.35]"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)'
            : 'radial-gradient(circle at 1px 1px, rgba(37,59,128,0.14) 1px, transparent 0)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 35%, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 35%, black 40%, transparent 85%)',
        }}
      />

      {/* Corner Precision Alignment Reticles */}
      <div className="absolute inset-6 sm:inset-10 opacity-30 dark:opacity-40 flex flex-col justify-between pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-500/70 dark:border-indigo-400/80" />
          <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-500/70 dark:border-indigo-400/80" />
        </div>
        <div className="flex justify-between items-end">
          <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-500/70 dark:border-indigo-400/80" />
          <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-500/70 dark:border-indigo-400/80" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* LAYER 3: Active Radar Laser Scanner Sweeps                   */}
      {/* ============================================================ */}
      {!reducedMotion && (
        <>
          {/* Vertical Axis Scanner (Travels down screen) */}
          <motion.div
            initial={{ y: '-10%', opacity: 0 }}
            animate={{
              y: ['-5%', '105%'],
              opacity: [0, 0.65, 0.8, 0.65, 0],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute left-0 right-0 h-[1.5px] pointer-events-none"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.2) 15%, rgba(6,182,212,0.85) 50%, rgba(99,102,241,0.2) 85%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(37,59,128,0.15) 15%, rgba(59,130,246,0.6) 50%, rgba(37,59,128,0.15) 85%, transparent 100%)',
              boxShadow: isDark
                ? '0 0 16px 1px rgba(6, 182, 212, 0.4), 0 0 3px rgba(255, 255, 255, 0.6)'
                : '0 0 12px 1px rgba(59, 130, 246, 0.3)',
            }}
          />

          {/* Horizontal Axis Radar Sweep (Travels left to right) */}
          <motion.div
            initial={{ x: '-10%', opacity: 0 }}
            animate={{
              x: ['-5%', '105%'],
              opacity: [0, 0.4, 0.55, 0.4, 0],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'linear',
              delay: 3,
            }}
            className="absolute top-0 bottom-0 w-[1px] pointer-events-none"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.15) 20%, rgba(99,102,241,0.7) 50%, rgba(168,85,247,0.15) 80%, transparent 100%)'
                : 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.1) 20%, rgba(37,59,128,0.4) 50%, rgba(99,102,241,0.1) 80%, transparent 100%)',
            }}
          />
        </>
      )}

      {/* ============================================================ */}
      {/* LAYER 4: Undulating Parametric Vector Sine Ribbons            */}
      {/* ============================================================ */}
      <motion.div
        style={{ x: plane1X, y: plane1Y }}
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-50 overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 800"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ribbon-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={isDark ? '0.7' : '0.4'} />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity={isDark ? '0.85' : '0.55'} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={isDark ? '0.6' : '0.35'} />
            </linearGradient>

            <linearGradient id="ribbon-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={isDark ? '0.5' : '0.3'} />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={isDark ? '0.65' : '0.4'} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={isDark ? '0.4' : '0.2'} />
            </linearGradient>

            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Primary Parametric Wave Ribbon */}
          <motion.path
            d="M -100 240 C 260 120, 520 380, 880 210 C 1180 80, 1380 320, 1600 220"
            stroke="url(#ribbon-grad-1)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            filter="url(#glow-filter)"
            initial={{ pathOffset: 0 }}
            animate={reducedMotion ? {} : {
              d: [
                'M -100 240 C 260 120, 520 380, 880 210 C 1180 80, 1380 320, 1600 220',
                'M -100 210 C 300 340, 560 140, 920 300 C 1220 180, 1360 150, 1600 240',
                'M -100 240 C 260 120, 520 380, 880 210 C 1180 80, 1380 320, 1600 220',
              ],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Harmonic Counter-Wave Ribbon */}
          <motion.path
            d="M -100 520 C 320 620, 600 420, 960 560 C 1240 680, 1420 460, 1600 510"
            stroke="url(#ribbon-grad-2)"
            strokeWidth="1.5"
            strokeDasharray="8 6"
            fill="none"
            filter="url(#glow-filter)"
            animate={reducedMotion ? {} : {
              d: [
                'M -100 520 C 320 620, 600 420, 960 560 C 1240 680, 1420 460, 1600 510',
                'M -100 560 C 280 440, 640 640, 1000 480 C 1280 540, 1400 620, 1600 530',
                'M -100 520 C 320 620, 600 420, 960 560 C 1240 680, 1420 460, 1600 510',
              ],
              strokeDashoffset: [0, -100],
            }}
            transition={{
              d: { duration: 22, repeat: Infinity, ease: 'easeInOut' },
              strokeDashoffset: { duration: 15, repeat: Infinity, ease: 'linear' },
            }}
          />
        </svg>
      </motion.div>

      {/* ============================================================ */}
      {/* LAYER 5: Floating Micro-Telemetry HUD & Geometric Reticles   */}
      {/* ============================================================ */}
      <motion.div
        style={{ x: plane2X, y: plane2Y }}
        className="absolute inset-0 pointer-events-none hidden md:block"
      >
        {telemetryNodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={reducedMotion ? { opacity: 0.6 } : {
              opacity: [0.35, 0.8, 0.35],
              scale: [1, 1.02, 1],
              y: [0, -6, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: node.delay,
            }}
            className="absolute flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/40 dark:bg-slate-900/40 border border-slate-300/40 dark:border-slate-700/50 backdrop-blur-xs text-[10px] font-mono tracking-wider text-slate-600 dark:text-slate-400 shadow-xs"
            style={{ left: node.x, top: node.y }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
            </span>
            <span>{node.label}</span>
          </motion.div>
        ))}

        {/* Delicate Center-Left Rotating Crosshair Reticle */}
        <div className="absolute left-[4%] top-[45%] opacity-25 dark:opacity-35">
          <motion.div
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border border-dashed border-indigo-400 rounded-full flex items-center justify-center"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-500/80" />
          </motion.div>
        </div>

        {/* Delicate Center-Right Precision Diamond Node */}
        <div className="absolute right-[5%] top-[50%] opacity-25 dark:opacity-35">
          <motion.div
            animate={reducedMotion ? {} : { rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border border-indigo-400/80 rotate-45 flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-cyan-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* LAYER 6: Interactive Cursor Spotlight Aura (Spring-Damped)   */}
      {/* ============================================================ */}
      {!reducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-75 transition-opacity duration-300"
          style={{
            background: isDark ? spotlightDark : spotlightLight,
          }}
        />
      )}
    </div>
  );
}
