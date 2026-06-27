'use client';

import { useState, useEffect } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import MarketingNav from '@/components/marketing/MarketingNav';
import HeroSection from '@/components/marketing/HeroSection';
import { SplineBackground } from '@/components/SplineBackground';
import HowItWorksSection from '@/components/marketing/HowItWorksSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import UseCasesSection from '@/components/marketing/UseCasesSection';
import FAQSection from '@/components/marketing/FAQSection';
import AboutSection from '@/components/marketing/AboutSection';
import EntrextSection from '@/components/marketing/EntrextSection';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export type ModeType = 'dom' | 'threejs' | 'webgl' | 'spa' | 'shadow-dom';

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
    bgGlow: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, rgba(124,58,237,0) 70%)',
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
    bgGlow: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0) 70%)',
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
    bgGlow: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0) 70%)',
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
    bgGlow: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0) 70%)',
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
    bgGlow: 'radial-gradient(circle, rgba(217,70,239,0.06) 0%, rgba(217,70,239,0) 70%)',
  },
};

export default function HomeClient() {
  const [activeMode, setActiveMode] = useState<ModeType>('dom');
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth lagging spring configuration for the background spotlight glow
  const glowX = useSpring(mouseX, { stiffness: 50, damping: 25 });
  const glowY = useSpring(mouseY, { stiffness: 50, damping: 25 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Offset the coordinate by half the size of the glow element (250px)
      // to keep it centered on the cursor
      mouseX.set(e.clientX - 250);
      mouseY.set(e.clientY - 250);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const colors = modeColors[activeMode];

  return (
    <div
      style={{
        '--color-pm-accent': colors.accent,
        '--color-pm-accent-bright': colors.bright,
        '--color-pm-accent-vivid': colors.vivid,
        '--pm-accent': colors.accent,
        '--pm-accent-bright': colors.bright,
        '--pm-accent-vivid': colors.vivid,
        '--pm-accent-glow': colors.glow,
        '--pm-accent-subtle': colors.subtle,
        '--pm-accent-mid': colors.mid,
        '--pm-cyan': colors.gradientEnd,
        '--pm-border-bright': colors.borderBright,
      } as React.CSSProperties}
      className="relative min-h-screen bg-transparent text-pm-text selection:bg-pm-accent/30 selection:text-white font-sans overflow-x-hidden scroll-smooth transition-colors duration-500"
    >
      
      {/* Spline 3D background */}
      <SplineBackground hoveredPosition={hoveredPosition} />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main className="flex-1 flex flex-col">
          <HeroSection activeMode={activeMode} setActiveMode={setActiveMode} onHoverChange={setHoveredPosition} />
          <HowItWorksSection />
          <FeaturesSection onHoverChange={setHoveredPosition} />
          <UseCasesSection onHoverChange={setHoveredPosition} />
          <FAQSection />
          <AboutSection />
          <EntrextSection />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
