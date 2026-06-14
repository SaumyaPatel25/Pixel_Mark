'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'FAQ', href: '#faq' },
    { name: 'About', href: '#about' },
    { name: 'Entrext', href: '#entrext' }
  ];

  return (
    <>
      <motion.nav
        animate={{
          backgroundColor: isScrolled ? 'rgba(10, 10, 15, 0.85)' : 'rgba(10, 10, 15, 0)',
          borderBottomColor: isScrolled ? 'rgba(120, 120, 200, 0.15)' : 'rgba(120, 120, 200, 0)',
          backdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)'
        }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 h-[60px] z-50 flex items-center justify-between px-6 md:px-12 border-b border-transparent transition-all"
      >
        {/* Left Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="text-pm-accent-bright group-hover:text-pm-cyan transition-colors duration-300">
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
          <span className="font-display font-semibold text-lg tracking-tight text-pm-text">
            PixelMark
          </span>
        </Link>

        {/* Center links - Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs font-semibold text-pm-muted hover:text-pm-text transition-colors duration-200"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Right buttons - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-xs font-bold uppercase tracking-widest text-pm-muted hover:text-pm-text transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="text-xs font-bold uppercase tracking-widest bg-pm-accent hover:bg-pm-accent-bright text-white px-5 py-2.5 rounded-lg shadow-accent transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden text-pm-text p-1 hover:bg-pm-surface-2 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-pm-bg/95 backdrop-blur-xl flex flex-col p-6"
          >
            <div className="flex items-center justify-between h-[60px] border-b border-pm-border">
              <span className="font-display font-bold text-lg text-pm-text">PixelMark</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-pm-text p-1 hover:bg-pm-surface-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col gap-6 items-center justify-center flex-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-2xl font-medium text-pm-muted hover:text-pm-text transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-4 border-t border-pm-border pt-6">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-sm font-bold uppercase tracking-widest text-pm-text border border-pm-border py-3 rounded-lg hover:bg-pm-surface-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-sm font-bold uppercase tracking-widest bg-pm-accent hover:bg-pm-accent-bright text-white py-3 rounded-lg shadow-accent transition-colors"
              >
                Start Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
