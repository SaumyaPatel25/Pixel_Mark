'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, ArrowRight, LogOut, Zap, Tag, Compass, 
  HelpCircle, Layers, FileCode2, Wrench, Sparkles,
  ChevronDown, ExternalLink, Globe
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useBillingStore } from '@/store/useBillingStore';
import { CrownDoodle } from '@/components/ui/CrownDoodle';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavPreviewItem {
  iconEmoji: string;
  title: string;
  desc: string;
  href: string;
}

interface NavLinkItem {
  name: string;
  href: string;
  badge?: string;
  preview: {
    headerIcon: React.ReactNode;
    title: string;
    subtitle: string;
    items: NavPreviewItem[];
  };
}

export default function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const isPaid = useBillingStore(state => state.isPaid);

  useEffect(() => {
    setMounted(true);
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 30);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (name: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNav(name);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNav(null);
    }, 150);
  };

  const isUserLoggedIn = mounted && !!user;

  const navLinks: NavLinkItem[] = [
    {
      name: 'Home',
      href: '/',
      preview: {
        headerIcon: <Globe className="w-4 h-4 text-purple-400" />,
        title: 'Home',
        subtitle: 'The Visual Website Feedback Tool',
        items: [
          { iconEmoji: '✨', title: 'Interactive Demo', desc: 'Experience live DOM & 3D canvas pinning', href: '/' },
          { iconEmoji: '🚀', title: 'Get Started', desc: 'Create your free project in seconds', href: '/register' },
          { iconEmoji: '⚡', title: 'Platform Features', desc: 'Explore feedback & DOM edit capabilities', href: '/features' },
          { iconEmoji: '🏷️', title: 'Pricing & Plans', desc: 'Free & Team options for product teams', href: '/pricing' },
        ]
      }
    },
    {
      name: 'Features',
      href: '/features',
      preview: {
        headerIcon: <Zap className="w-4 h-4 text-purple-400" />,
        title: 'Features',
        subtitle: 'Everything you need to review',
        items: [
          { iconEmoji: '🚀', title: 'Live DOM Pinning', desc: 'Click & annotate anywhere on live web pages', href: '/features' },
          { iconEmoji: '🧊', title: 'WebGL & 3D Canvas', desc: 'Inspect Three.js meshes, shaders & scenes', href: '/features' },
          { iconEmoji: '🎨', title: 'DOM Edit Streaming', desc: 'Propose CSS & copy modifications live', href: '/features' },
          { iconEmoji: '⚡', title: 'Auto Telemetry', desc: 'XPath, computed styles & console traces', href: '/features' },
        ]
      }
    },
    {
      name: 'Pricing',
      href: '/pricing',
      badge: '25% OFF',
      preview: {
        headerIcon: <Tag className="w-4 h-4 text-emerald-400" />,
        title: 'Pricing & Plans',
        subtitle: 'Simple, transparent team tiers',
        items: [
          { iconEmoji: '🎁', title: 'Free Starter', desc: '$0 forever · 1 dev seat & sandbox testing', href: '/pricing' },
          { iconEmoji: '⚡', title: 'Dev Team Plan', desc: '$21.75/mo · Flat fee up to 5 developers', href: '/pricing' },
          { iconEmoji: '🏢', title: 'Enterprise SLA', desc: 'Custom seats, SSO & on-premise setups', href: '/pricing' },
          { iconEmoji: '🔥', title: 'Early Bird Tier', desc: 'Claim 25% discount while spots last', href: '/pricing' },
        ]
      }
    },
    {
      name: 'Workflow',
      href: '/#how-it-works',
      preview: {
        headerIcon: <Layers className="w-4 h-4 text-cyan-400" />,
        title: 'Workflow',
        subtitle: 'From review to sign-off',
        items: [
          { iconEmoji: '🔗', title: '1. Share Review Link', desc: 'Zero-friction links for external clients', href: '/#how-it-works' },
          { iconEmoji: '📍', title: '2. Drop Context Pins', desc: 'Report layout bugs without screenshots', href: '/#how-it-works' },
          { iconEmoji: '💬', title: '3. Threaded Replies', desc: 'Align designers, developers & clients', href: '/#how-it-works' },
          { iconEmoji: '✅', title: '4. Instant Sign-Off', desc: 'Approve production changes in real time', href: '/#how-it-works' },
        ]
      }
    },
    {
      name: 'FAQ',
      href: '/faq',
      preview: {
        headerIcon: <HelpCircle className="w-4 h-4 text-rose-400" />,
        title: 'Help & FAQ',
        subtitle: 'Answers to common questions',
        items: [
          { iconEmoji: '🎯', title: 'How STAGE Works', desc: 'No-code client onboarding & setup', href: '/faq' },
          { iconEmoji: '🛡️', title: 'Live Proxy Security', desc: 'Handling CSP & iframe restrictions', href: '/faq' },
          { iconEmoji: '👥', title: 'Client Access', desc: 'No sign up or login required for clients', href: '/faq' },
          { iconEmoji: '📝', title: 'Task Exporting', desc: 'Push feedback directly to your backlog', href: '/faq' },
        ]
      }
    },
    {
      name: 'About',
      href: '/company',
      preview: {
        headerIcon: <Compass className="w-4 h-4 text-teal-400" />,
        title: 'About STAGE',
        subtitle: 'By Entrext Labs',
        items: [
          { iconEmoji: '🚀', title: 'Our Mission', desc: 'The visual collaboration layer for the web', href: '/company' },
          { iconEmoji: '🏛️', title: 'Company Story', desc: 'Built for developers, QA & clients', href: '/company#story' },
          { iconEmoji: '🤝', title: 'Careers & Hub', desc: 'Join the Entrext Labs engineering team', href: '/company' },
          { iconEmoji: '🐦', title: 'Twitter @Stage0fficial', desc: 'Follow us for product updates & drops', href: 'https://x.com/Stage0fficial' },
        ]
      }
    },
  ];

  return (
    <>
      <motion.nav
        animate={{
          y: isScrolled ? 10 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 mx-auto max-w-7xl px-4 md:px-6 pointer-events-auto"
      >
        <div 
          className={`flex items-center justify-between h-[64px] transition-all duration-300 ease-out px-6 ${
            isScrolled 
              ? 'bg-pm-surface/90 dark:bg-pm-surface/90 backdrop-blur-xl rounded-full border border-pm-border shadow-[0_16px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]' 
              : 'bg-transparent border-b border-transparent'
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <Image 
              src="/logo.png" 
              alt="STAGE Logo" 
              width={240}
              height={112}
              className="h-24 w-auto object-contain dark-theme-logo group-hover:scale-105 transition-transform duration-200" 
              priority
            />
          </Link>

          {/* Desktop Interactive Nav Links with Hover Preview Cards */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 relative">
            {navLinks.map((link) => {
              const isHovered = hoveredNav === link.name;

              return (
                <div
                  key={link.name}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(link.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 ${
                      isHovered
                        ? 'text-pm-text bg-pm-surface-2 dark:bg-white/10 shadow-sm'
                        : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-[9px] font-black tracking-normal">
                        {link.badge}
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-3 h-3 transition-transform duration-200 opacity-60 ${
                        isHovered ? 'rotate-180 text-pm-accent' : ''
                      }`} 
                    />
                  </Link>

                  {/* ── Screen-Like Hover Dropdown Card (MonkFeed Style) ── */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 z-50 w-[300px] pointer-events-auto"
                        onMouseEnter={() => handleMouseEnter(link.name)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                          
                          {/* Card Header (Dark Top Bar as in reference image) */}
                          <div className="bg-[#181920] dark:bg-[#0f1016] text-white p-3.5 flex items-center gap-3 border-b border-white/10">
                            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 shadow-inner">
                              {link.preview.headerIcon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-white text-xs tracking-tight leading-tight">
                                {link.preview.title}
                              </h4>
                              <p className="text-[10px] text-white/60 font-medium truncate">
                                {link.preview.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Card Body Rows (Soft pills matching reference image) */}
                          <div className="bg-white dark:bg-[#13141d] p-2 space-y-1">
                            {link.preview.items.map((item, idx) => (
                              <Link
                                key={idx}
                                href={item.href}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left group/item cursor-pointer"
                              >
                                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-sm flex-shrink-0 group-hover/item:scale-110 group-hover/item:bg-purple-100 dark:group-hover/item:bg-purple-900/30 transition-all shadow-sm">
                                  {item.iconEmoji}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate leading-snug">
                                    {item.desc}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>

                          {/* Card Footer Quick Link */}
                          <div className="bg-slate-50 dark:bg-[#0f1016] px-3 py-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-pm-muted">
                            <span>Explore {link.name}</span>
                            <ArrowRight className="w-3 h-3 text-purple-500" />
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right CTA Actions */}
          <div className={`hidden md:flex items-center gap-3 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <ThemeToggle />
            {isUserLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-3.5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-pm-muted hover:text-pm-accent hover:bg-pm-surface-2 transition-all"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>HI, {user?.name ? user.name.toUpperCase() : 'DEVELOPER'}</span>
                    {isPaid && <CrownDoodle className="w-4 h-4" />}
                  </span>
                </Link>
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 rounded-full bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 flex items-center gap-1.5 transition-all"
                >
                  Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => logout()}
                  className="p-2 text-pm-muted hover:text-rose-500 transition-colors cursor-pointer rounded-full hover:bg-rose-500/10"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-full bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 flex items-center gap-1.5 transition-all"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-pm-text p-2 hover:bg-pm-surface-2 rounded-full transition-colors cursor-pointer"
              aria-label="Open Mobile Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] bg-pm-bg/98 dark:bg-pm-bg/98 backdrop-blur-2xl flex flex-col p-6 text-pm-text overflow-y-auto"
          >
            <div className="flex items-center justify-between h-[64px] border-b border-pm-border pb-4">
              <span className="font-display font-extrabold text-xl text-pm-text tracking-tight">STAGE</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-pm-text p-2 hover:bg-pm-surface-2 rounded-xl transition-colors cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 py-8 flex-1">
              {navLinks.map((link) => (
                <div key={link.name} className="border-b border-pm-border/40 pb-3">
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-1 text-lg font-bold text-pm-text hover:text-pm-accent transition-colors"
                  >
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                  <p className="text-xs text-pm-muted">{link.preview.subtitle}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-pm-border pt-6">
              {isUserLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-xs font-mono font-bold uppercase tracking-wider text-pm-text bg-pm-surface border border-pm-border py-3.5 rounded-2xl shadow-sm"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-center text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 py-3.5 rounded-2xl cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-xs font-mono font-bold uppercase tracking-wider text-pm-text bg-pm-surface border border-pm-border py-3.5 rounded-2xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-xs font-mono font-bold uppercase tracking-wider bg-pm-accent text-white py-3.5 rounded-2xl shadow-lg shadow-purple-600/20"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
