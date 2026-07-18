'use client';

import MarketingNav from '@/components/marketing/MarketingNav';
import UseCasesSection from '@/components/marketing/UseCasesSection';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-pm-text selection:bg-[#253B80]/30 selection:text-[#1D264F] font-sans overflow-x-hidden scroll-smooth">
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main className="flex-1 flex flex-col pt-20">
          <UseCasesSection onHoverChange={() => {}} />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
