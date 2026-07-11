'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function MarketingFooter() {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && !!user;
  
  return (
    <footer className="relative bg-pm-surface-2 border-t border-pm-border/30 pt-24 pb-16 overflow-hidden">
      {/* Footer glow backdrop */}
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-pm-accent-subtle rounded-full blur-[80px] pointer-events-none z-0" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          {/* Column 1: Brand */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <Link href="/" className="block">
              <img src="/logo.png" alt="PixelMark" className="h-6 w-auto object-contain" />
            </Link>
            <p className="text-xs text-pm-muted leading-relaxed max-w-sm font-sans">
              Precision visual feedback and website reviews built for designers, developers, QA teams, and agencies. Bridge the gap between UI revisions and codebase fixes.
            </p>
            <a href="mailto:saumyavishwam@gmail.com" className="block text-[11px] font-mono font-bold text-pm-accent hover:underline pt-2">
              saumyavishwam@gmail.com
            </a>
          </div>

          {/* Column 2: Product */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-pm-accent">Product</h4>
            <div className="flex flex-col gap-2.5 text-[11px] font-mono font-bold text-pm-muted">
              <a href="#features" className="hover:text-pm-accent transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-pm-accent transition-colors">How It Works</a>
              <Link href="/pricing" className="hover:text-pm-accent transition-colors">Pricing</Link>
              <Link href={isUserLoggedIn ? "/dashboard" : "/register"} className="hover:text-pm-accent transition-colors">
                {isUserLoggedIn ? "Dashboard" : "Start Free"}
              </Link>
            </div>
          </div>

          {/* Column 3: Company */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-pm-accent">Company</h4>
            <div className="flex flex-col gap-2.5 text-[11px] font-mono font-bold text-pm-muted">
              <Link href="/company#story" className="hover:text-pm-accent transition-colors">About Story</Link>
              <Link href="/company#company" className="hover:text-pm-accent transition-colors">Entrext Labs</Link>
              <a href="https://entrextlabs.substack.com/subscribe" target="_blank" rel="noopener noreferrer" className="hover:text-pm-accent transition-colors">Blog Substack</a>
              <Link href="/company#opportunities" className="hover:text-pm-accent transition-colors">Careers</Link>
            </div>
          </div>

          {/* Column 4: Legal */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-pm-accent">Legal</h4>
            <div className="flex flex-col gap-2.5 text-[11px] font-mono font-bold text-pm-muted">
              <Link href="/company#legal" className="hover:text-pm-accent transition-colors">Privacy Policy</Link>
              <Link href="/company#legal" className="hover:text-pm-accent transition-colors">Terms of Service</Link>
              <Link href="/company#legal" className="hover:text-pm-accent transition-colors">CORS Scoping Agreement</Link>
              <Link href="/company#legal" className="hover:text-pm-accent transition-colors">Security Disclosures</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-pm-border/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] text-pm-muted leading-relaxed text-center md:text-left font-mono">
            <span>© 2026 PixelMark. All rights protected. Built for the developer community.</span>
          </div>
          
          <div className="flex gap-6 text-[10px] font-mono font-bold uppercase tracking-wider text-pm-muted">
            <a
              href="https://www.linkedin.com/in/saumya-rajeshbhai-patel-857290372"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pm-accent transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              LinkedIn
            </a>
            <a
              href="https://github.com/sp25126"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pm-accent transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
