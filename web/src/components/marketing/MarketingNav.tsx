'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, LogOut, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavLinkItem {
  name: string;
  href: string;
  badge?: string;
  badgePastel?: string;
}

export default function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    setMounted(true);
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isUserLoggedIn = mounted && !!user;

  // Clean, focused navigation per Spec v2.0
  const navLinks: NavLinkItem[] = [
    { name: 'How it works', href: '/#how-it-works' },
    { name: 'Features', href: '/features' },
    { 
      name: 'Pricing', 
      href: '/pricing',
      badge: 'Free Tier',
      badgePastel: 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
    },
    { name: 'FAQ', href: '/#faq' },
  ];

  return (
    <>
      {/* Floating Island Header Container */}
      <header
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-3.5 sm:pt-4 pointer-events-none transition-all duration-300"
      >
        <div
          className={`pointer-events-auto max-w-5xl mx-auto h-14 sm:h-16 rounded-full px-3.5 sm:px-5 flex items-center justify-between transition-all duration-300 ${
            isScrolled
              ? 'bg-white/90 dark:bg-[#141318]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(20,18,24,0.08)]'
              : 'bg-white/75 dark:bg-[#141318]/75 backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-[0_4px_20px_rgba(20,18,24,0.04)]'
          }`}
        >
          {/* Left Brand Lockup (Logo + Tagline) */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <Image 
                src="/logo.png" 
                alt="STAGE Logo" 
                width={140}
                height={50}
                className="h-8 sm:h-9 w-auto object-contain dark-theme-logo group-hover:opacity-90 transition-opacity" 
                priority
              />
            </Link>

            <span className="hidden md:inline-block w-px h-4 bg-slate-200 dark:bg-white/15" />

            <span className="hidden md:inline-block text-[11px] font-mono text-pm-muted tracking-tight">
              Share. Review. Fix.
            </span>
          </div>

          {/* Center: Vercel-Style Gliding Hover Pill Navigation */}
          <nav 
            onMouseLeave={() => setHoveredIdx(null)}
            className="hidden lg:flex items-center relative gap-0.5 p-1 rounded-full"
          >
            {navLinks.map((link, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  className="relative px-3.5 py-1.5 rounded-full text-xs font-sans font-medium text-[#16141A] dark:text-white transition-colors duration-150 flex items-center gap-1.5"
                >
                  {isHovered && (
                    <motion.span
                      layoutId="nav-hover-pill"
                      className="absolute inset-0 rounded-full bg-slate-100 dark:bg-white/10 -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className={`text-[9px] font-mono font-semibold px-2 py-0.2 rounded-full ${link.badgePastel}`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: ThemeToggle + Sign In + Button-in-Button CTA */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />

            {isUserLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] text-xs font-mono font-semibold transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>Dashboard</span>
                  <span className="w-6 h-6 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>

                <button
                  onClick={() => logout()}
                  className="p-2 text-pm-muted hover:text-rose-500 rounded-full hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="hidden sm:inline-block px-3 py-1.5 rounded-full text-xs font-sans font-medium text-pm-muted hover:text-[#16141A] dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>

                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 pl-3.5 sm:pl-4 pr-1.5 py-1.5 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] text-xs font-mono font-semibold tracking-wider transition-all shadow-xs active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Create review link</span>
                  <span className="w-6 h-6 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Morph Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-[#16141A] dark:text-white cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between items-center relative">
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`}
                />
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-200 ${
                    mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Down Sheet Menu (ADPList Humanist Style) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-20 z-50 p-2 rounded-[2rem] bg-slate-900/[0.05] dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
          >
            <div className="p-6 rounded-[1.625rem] bg-white dark:bg-[#16141A] space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-pm-muted">
                  Menu
                </span>
                <span className="text-[11px] font-mono text-[#2B4CFF] bg-[#2B4CFF]/10 px-2.5 py-0.5 rounded-full font-semibold">
                  Share. Review. Fix.
                </span>
              </div>

              {/* Mobile Links */}
              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-sm font-semibold text-[#16141A] dark:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{link.name}</span>
                      {link.badge && (
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${link.badgePastel}`}>
                          {link.badge}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-pm-muted" />
                  </Link>
                ))}
              </div>

              {/* Mobile CTAs */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                {isUserLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 rounded-full bg-[#16141A] text-white dark:bg-white dark:text-[#16141A] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-center text-xs font-mono text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3.5 rounded-full bg-[#16141A] text-white dark:bg-white dark:text-[#16141A] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Create a review link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 rounded-full text-center text-xs font-sans font-medium text-pm-muted hover:text-[#16141A] dark:hover:text-white block transition-colors"
                    >
                      Already have an account? Sign in
                    </Link>
                  </>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
