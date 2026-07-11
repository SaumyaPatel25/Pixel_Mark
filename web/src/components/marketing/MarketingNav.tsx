'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isUserLoggedIn = mounted && !!user;

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'Workflow', href: '/#use-cases' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'FAQ', href: '/#faq' },
    { name: 'About', href: '/company#story' }
  ];

  return (
    <>
      <motion.nav
        animate={{
          y: isScrolled ? 12 : 0,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 mx-auto max-w-7xl px-4 md:px-6 transition-all"
      >
        <div 
          className={`flex items-center justify-between h-[64px] transition-all duration-300 px-6 ${
            isScrolled 
              ? 'bg-pm-surface/90 backdrop-blur-md rounded-full border border-pm-border shadow-[0_12px_40px_-12px_rgba(41,54,129,0.08)]' 
              : 'bg-transparent border-b border-transparent'
          }`}
        >
          {/* Logo */}
          <Link href="/" className="block">
            <img src="/logo.png" alt="PixelMark" className="h-7 w-auto object-contain" />
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted hover:text-pm-accent transition-colors relative group py-2"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-pm-accent transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {isUserLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="btn-ghost-3d text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted hover:text-pm-accent transition-colors"
                >
                  Hi, {user?.name || 'Developer'}
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-primary-3d text-[11px] font-mono font-bold uppercase tracking-wider bg-pm-accent hover:bg-pm-accent-bright text-white px-5 py-2.5 rounded-full flex items-center gap-1.5"
                >
                  Dashboard <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => logout()}
                  className="p-2 text-pm-muted hover:text-red-500 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="btn-ghost-3d text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted hover:text-pm-accent transition-colors px-3 py-2"
                >
                  Dashboard
                </Link>
                <Link
                  href="/login"
                  className="btn-ghost-3d text-[11px] font-mono font-bold uppercase tracking-wider text-pm-muted hover:text-pm-accent transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn-primary-3d text-[11px] font-mono font-bold uppercase tracking-wider bg-pm-accent hover:bg-pm-accent-bright text-white px-5 py-2.5 rounded-full flex items-center gap-1.5"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-pm-text p-1.5 hover:bg-pm-surface-2 rounded-full transition-colors cursor-pointer"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] bg-pm-surface/98 backdrop-blur-xl flex flex-col p-6 text-pm-text"
          >
            <div className="flex items-center justify-between h-[64px] border-b border-pm-border">
              <span className="font-display font-extrabold text-lg text-pm-text">PixelMark</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-pm-text p-1.5 hover:bg-pm-surface-2 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-8 items-center justify-center flex-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-2xl font-bold text-pm-muted hover:text-pm-accent transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-4 border-t border-pm-border pt-6">
              {isUserLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-xs font-mono font-bold uppercase tracking-wider text-pm-text border border-pm-border py-3.5 rounded-xl hover:bg-pm-surface-2 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-center text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary-3d text-center text-xs font-mono font-bold uppercase tracking-wider text-pm-text border border-pm-border py-3.5 rounded-xl"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary-3d text-center text-xs font-mono font-bold uppercase tracking-wider text-pm-text border border-pm-border py-3.5 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary-3d text-center text-xs font-mono font-bold uppercase tracking-wider bg-pm-accent text-white py-3.5 rounded-xl"
                  >
                    Get Started
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
