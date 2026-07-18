'use client';

import { useState, useEffect } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import dynamic from 'next/dynamic';
import MarketingNav from '@/components/marketing/MarketingNav';
import HeroSection from '@/components/marketing/HeroSection';
import HowItWorksSection from '@/components/marketing/HowItWorksSection';
import WhyPixelMarkSection from '@/components/marketing/WhyPixelMarkSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import ClosingCTASection from '@/components/marketing/ClosingCTASection';
import MarketingFooter from '@/components/marketing/MarketingFooter';

const SplineBackground = dynamic(
  () => import('@/components/SplineBackground').then((mod) => mod.SplineBackground),
  { ssr: false }
);

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
  const [isHeroTextComplete, setIsHeroTextComplete] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth lagging spring configuration for the background spotlight glow
  const glowX = useSpring(mouseX, { stiffness: 50, damping: 25 });
  const glowY = useSpring(mouseY, { stiffness: 50, damping: 25 });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('homepage-active');
    }
    const handleMouseMove = (e: MouseEvent) => {
      // Offset the coordinate by half the size of the glow element (250px)
      // to keep it centered on the cursor
      mouseX.set(e.clientX - 250);
      mouseY.set(e.clientY - 250);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('homepage-active');
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return (
    <div
      className="homepage-root relative min-h-screen bg-transparent text-pm-text selection:bg-[#253B80]/30 selection:text-[#1D264F] font-sans overflow-x-hidden scroll-smooth transition-colors duration-500"
    >
      
      {/* Spline 3D background */}
      <SplineBackground hoveredPosition={hoveredPosition} isHeroTextComplete={isHeroTextComplete} />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main className="flex-1 flex flex-col">
          <HeroSection 
            activeMode={activeMode} 
            setActiveMode={setActiveMode} 
            onHoverChange={setHoveredPosition} 
            isHeroTextComplete={isHeroTextComplete}
            onHeroTextComplete={() => setIsHeroTextComplete(true)}
          />
          <HowItWorksSection />
          <WhyPixelMarkSection />
          <FeaturesSection onHoverChange={setHoveredPosition} />
          <ClosingCTASection />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
