'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';

export default function MarketingFooter() {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && !!user;

  return (
    <footer className="relative bg-white dark:bg-[#121114] border-t border-pm-border/40 pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Main Row */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-10 pb-12 border-b border-pm-border/30">
          {/* Brand & Tagline */}
          <div className="space-y-3 max-w-sm">
            <Link href="/" className="inline-block">
              <Image 
                src="/logo.png" 
                alt="STAGE Logo" 
                width={120} 
                height={40} 
                className="h-10 w-auto object-contain dark-theme-logo" 
              />
            </Link>
            <p className="text-sm font-semibold text-[#16141A] dark:text-white">
              Share. Review. Fix.
            </p>
            <p className="text-xs text-pm-muted leading-relaxed font-sans">
              Get client feedback on the live page, not in screenshots. A product of Entrext.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted block">
                Product
              </span>
              <ul className="space-y-2.5 text-xs font-medium text-pm-muted">
                <li>
                  <Link href="/#how-it-works" className="hover:text-[#2B4CFF] transition-colors">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#2B4CFF] transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="hover:text-[#2B4CFF] transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href={isUserLoggedIn ? "/dashboard" : "/register"} className="hover:text-[#2B4CFF] transition-colors">
                    {isUserLoggedIn ? "Dashboard" : "Create review link"}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted block">
                Contact & Support
              </span>
              <ul className="space-y-2.5 text-xs font-medium text-pm-muted">
                <li>
                  <a href="mailto:saumyavishwam@gmail.com" className="hover:text-[#2B4CFF] transition-colors">
                    Contact team
                  </a>
                </li>
                <li>
                  <Link href="/feedback" className="hover:text-[#2B4CFF] transition-colors">
                    Give feedback
                  </Link>
                </li>
                <li>
                  <a
                    href="https://x.com/Stage0fficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#2B4CFF] transition-colors"
                  >
                    @Stage0fficial
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted block">
                Legal
              </span>
              <ul className="space-y-2.5 text-xs font-medium text-pm-muted">
                <li>
                  <Link href="/company#legal" className="hover:text-[#2B4CFF] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/company#legal" className="hover:text-[#2B4CFF] transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-pm-muted font-sans">
          <div>
            © {new Date().getFullYear()} STAGE. All rights reserved. A product of Entrext.
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://x.com/Stage0fficial"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2B4CFF] transition-colors font-mono text-[11px]"
            >
              X / Twitter
            </a>
            <a
              href="https://github.com/sp25126"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2B4CFF] transition-colors font-mono text-[11px]"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/saumya-rajeshbhai-patel-857290372"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2B4CFF] transition-colors font-mono text-[11px]"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
