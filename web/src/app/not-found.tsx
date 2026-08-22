import Link from 'next/link';
import type { Metadata } from 'next';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { seoConfig } from '@/lib/seoConfig';
import { ArrowLeft, Compass, Search, Home, FileText, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 Page Not Found — STAGE',
  description: 'The page you requested could not be found on STAGE. Explore our visual website feedback tools, pricing, developer API docs, or return home.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans flex flex-col justify-between selection:bg-pm-accent/20">
      <MarketingNav />

      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center max-w-3xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pm-accent-subtle border border-pm-border text-pm-accent text-xs font-mono font-bold uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Error 404 — Route Not Found</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-pm-text">
          Lost in <span className="bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">STAGE?</span>
        </h1>

        <p className="text-base text-pm-muted max-w-lg mx-auto leading-relaxed">
          The link or page you are looking for does not exist or may have been moved. Let's get you back on track to reviewing live websites.
        </p>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl pt-4">
          <Link
            href="/"
            className="p-4 rounded-2xl bg-pm-surface border border-pm-border hover:border-pm-accent/40 text-pm-text font-bold text-xs transition-all flex flex-col items-center gap-2 text-center shadow-sm"
          >
            <Home className="w-5 h-5 text-pm-accent" />
            <span>Homepage</span>
          </Link>
          <Link
            href="/pricing"
            className="p-4 rounded-2xl bg-pm-surface border border-pm-border hover:border-pm-accent/40 text-pm-text font-bold text-xs transition-all flex flex-col items-center gap-2 text-center shadow-sm"
          >
            <Zap className="w-5 h-5 text-cyan-500" />
            <span>Pricing & Plans</span>
          </Link>
          <Link
            href="/docs/api"
            className="p-4 rounded-2xl bg-pm-surface border border-pm-border hover:border-pm-accent/40 text-pm-text font-bold text-xs transition-all flex flex-col items-center gap-2 text-center shadow-sm"
          >
            <FileText className="w-5 h-5 text-emerald-500" />
            <span>API Docs</span>
          </Link>
        </div>

        <div className="pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pm-accent text-white font-extrabold text-xs hover:bg-pm-accent-bright transition-all shadow-lg shadow-purple-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to STAGE Home</span>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
