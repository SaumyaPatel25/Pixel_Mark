'use client';

import MarketingNav from '@/components/marketing/MarketingNav';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import UseCasesSection from '@/components/marketing/UseCasesSection';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import AmbientBackground from '@/components/marketing/AmbientBackground';

export default function FeaturesClient() {
  return (
    <div className="relative min-h-screen bg-[var(--pm-bg)] text-pm-text selection:bg-[#2B4CFF]/20 selection:text-[#16141A] font-sans overflow-x-hidden scroll-smooth">
      <AmbientBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main className="flex-1 flex flex-col pt-16">
          <FeaturesSection />
          <UseCasesSection />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
