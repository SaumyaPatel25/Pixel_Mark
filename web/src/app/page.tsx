'use client';

import { useEffect } from 'react';
import { useMotionValue, useSpring, motion } from 'framer-motion';
import MarketingNav from '@/components/marketing/MarketingNav';
import HeroSection from '@/components/marketing/HeroSection';
import HowItWorksSection from '@/components/marketing/HowItWorksSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import UseCasesSection from '@/components/marketing/UseCasesSection';
import FAQSection from '@/components/marketing/FAQSection';
import AboutSection from '@/components/marketing/AboutSection';
import EntrextSection from '@/components/marketing/EntrextSection';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function Home() {
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

  return (
    <div className="relative min-h-screen bg-pm-bg text-pm-text selection:bg-pm-accent/30 selection:text-white font-sans overflow-x-hidden scroll-smooth">
      
      {/* Background Cursor Glow Spotlight (only visible on pointer devices) */}
      <motion.div
        style={{
          x: glowX,
          y: glowY,
          position: 'fixed',
          top: 0,
          left: 0,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
          filter: 'blur(30px)',
        }}
        className="hidden md:block"
      />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main className="flex-1 flex flex-col">
          <HeroSection />
          <HowItWorksSection />
          <FeaturesSection />
          <UseCasesSection />
          <FAQSection />
          <AboutSection />
          <EntrextSection />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
