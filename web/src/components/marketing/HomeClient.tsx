'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MarketingNav from '@/components/marketing/MarketingNav';
import HeroSection from '@/components/marketing/HeroSection';
import { SplineBackground } from '@/components/SplineBackground';

const StoryProcessSection = dynamic(() => import('@/components/marketing/StoryProcessSection'), { ssr: true });
const HowItWorksSection = dynamic(() => import('@/components/marketing/HowItWorksSection'), { ssr: true });
const UseCasesSection = dynamic(() => import('@/components/marketing/UseCasesSection'), { ssr: true });
const OutcomeSection = dynamic(() => import('@/components/marketing/OutcomeSection'), { ssr: true });
const ClosingCTASection = dynamic(() => import('@/components/marketing/ClosingCTASection'), { ssr: true });
const EntrextSection = dynamic(() => import('@/components/marketing/EntrextSection'), { ssr: true });
const MarketingFooter = dynamic(() => import('@/components/marketing/MarketingFooter'), { ssr: true });

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
  const [isHeroTextComplete, setIsHeroTextComplete] = useState(true);
  const [loadStage, setLoadStage] = useState(1);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scheduleStage = (stage: number, delay: number) => {
      return setTimeout(() => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => setLoadStage(stage));
        } else {
          setLoadStage(stage);
        }
      }, delay);
    };
    const t1 = scheduleStage(2, 200);
    const t2 = scheduleStage(3, 400);
    const t3 = scheduleStage(4, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('homepage-active');
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('homepage-active');
      }
    };
  }, []);

  const processSection = React.useMemo(() => isDark ? <HowItWorksSection /> : <StoryProcessSection />, [isDark]);
  const outcomeSection = React.useMemo(() => <OutcomeSection />, []);
  const closingCTASection = React.useMemo(() => <ClosingCTASection />, []);
  const entrextSection = React.useMemo(() => <EntrextSection />, []);
  const footerSection = React.useMemo(() => <MarketingFooter />, []);

  return (
    <div
      className="homepage-root relative min-h-screen bg-[var(--pm-bg)] text-pm-text selection:bg-[#253B80]/30 selection:text-[#1D264F] font-sans overflow-x-hidden scroll-smooth transition-colors duration-500"
    >
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
          {loadStage >= 1 && processSection}
          {loadStage >= 2 && <UseCasesSection onHoverChange={setHoveredPosition} />}
          {loadStage >= 3 && outcomeSection}
          {loadStage >= 4 && closingCTASection}
          {loadStage >= 4 && entrextSection}
        </main>
        {loadStage >= 4 && footerSection}
      </div>
    </div>
  );
}
