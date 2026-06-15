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
    <footer className="relative bg-transparent border-t border-pm-border pt-16 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12">
          {/* Column 1: Brand */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="text-pm-accent-bright">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <rect x="1.5" y="1.5" width="23" height="23" rx="5"
                    stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/>
                  <circle cx="13" cy="13" r="4"
                    stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <line x1="13" y1="6" x2="13" y2="9"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="13" y1="17" x2="13" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6"  y1="13" x2="9"  y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="17" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="4.5"  cy="4.5"  r="1.5" fill="currentColor" opacity="0.5"/>
                  <circle cx="21.5" cy="4.5"  r="1.5" fill="currentColor" opacity="0.5"/>
                  <circle cx="4.5"  cy="21.5" r="1.5" fill="currentColor" opacity="0.5"/>
                  <circle cx="21.5" cy="21.5" r="1.5" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
              <span className="font-display font-bold text-lg text-pm-text">PixelMark</span>
            </Link>
            <p className="text-xs text-pm-muted leading-relaxed max-w-sm">
              Precision visual feedback and DOM audits built for designers, developers, QA teams, and agencies. Bridge the gap between UI revisions and codebase fixes.
            </p>
          </div>

          {/* Column 2: Product */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Product</h4>
            <div className="flex flex-col gap-2 text-xs text-pm-muted">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href={isUserLoggedIn ? "/dashboard" : "/register"} className="hover:text-white transition-colors">
                {isUserLoggedIn ? "Dashboard" : "Start Free"}
              </Link>
            </div>
          </div>

          {/* Column 3: Company */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Company</h4>
            <div className="flex flex-col gap-2 text-xs text-pm-muted">
              <a href="#about" className="hover:text-white transition-colors">About Story</a>
              <a href="#entrext" className="hover:text-white transition-colors">Entrext Labs</a>
              <a href="https://entrextlabs.substack.com/subscribe" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Blog / Substack</a>
              <span className="text-pm-muted/40 cursor-default">Careers (Coming)</span>
            </div>
          </div>

          {/* Column 4: Legal */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Legal</h4>
            <div className="flex flex-col gap-2 text-xs text-pm-muted">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms & Conditions</span>
              <span className="hover:text-white cursor-pointer transition-colors">Security Boundaries</span>
              <span className="hover:text-white cursor-pointer transition-colors">CORS Scoping Policy</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-pm-border flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] text-pm-muted leading-relaxed text-center md:text-left">
            <span>© 2026 PixelMark by </span>
            <a href="https://entrextlabs.entrext.com/" className="text-pm-accent-vivid hover:underline">
              Entrext Labs
            </a>
            <span>. All rights protected. Built for the developer community.</span>
          </div>
          
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-pm-muted">
            <a
              href="https://www.linkedin.com/company/entrext/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors cursor-pointer"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/sp25126"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors cursor-pointer"
            >
              GitHub
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
