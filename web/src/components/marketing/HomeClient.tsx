'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MarketingNav from '@/components/marketing/MarketingNav';
import HeroSection from '@/components/marketing/HeroSection';
import AmbientBackground from '@/components/marketing/AmbientBackground';

const ProblemSection = dynamic(() => import('@/components/marketing/ProblemSection'), { ssr: true });
const HowItWorksSection = dynamic(() => import('@/components/marketing/HowItWorksSection'), { ssr: true });
const FeaturesSection = dynamic(() => import('@/components/marketing/FeaturesSection'), { ssr: true });
const UseCasesSection = dynamic(() => import('@/components/marketing/UseCasesSection'), { ssr: true });
const FAQSection = dynamic(() => import('@/components/marketing/FAQSection'), { ssr: true });
const ClosingCTASection = dynamic(() => import('@/components/marketing/ClosingCTASection'), { ssr: true });
const MarketingFooter = dynamic(() => import('@/components/marketing/MarketingFooter'), { ssr: true });

export type ModeType = 'dom' | 'threejs' | 'webgl' | 'spa' | 'shadow-dom';

export default function HomeClient() {
  const [activeMode, setActiveMode] = useState<ModeType>('dom');

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

  return (
    <div
      className="homepage-root relative min-h-screen bg-[var(--pm-bg)] text-pm-text selection:bg-[#2B4CFF]/20 selection:text-[#16141A] font-sans overflow-x-hidden scroll-smooth transition-colors duration-500"
    >
      <AmbientBackground />
      
      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main className="flex-1 flex flex-col">
          <HeroSection 
            activeMode={activeMode} 
            setActiveMode={setActiveMode} 
            isHeroTextComplete={true}
          />
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_600px]">
            <ProblemSection />
          </div>
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_800px]">
            <HowItWorksSection />
          </div>
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_800px]">
            <FeaturesSection />
          </div>
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_800px]">
            <UseCasesSection />
          </div>
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_800px]">
            <FAQSection />
          </div>
          <div className="[content-visibility:auto] [contain-intrinsic-size:1px_800px]">
            <ClosingCTASection />
          </div>
        </main>
        <div className="[content-visibility:auto] [contain-intrinsic-size:1px_400px]">
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
