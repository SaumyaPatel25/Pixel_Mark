'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const links = [
  { name: 'Home', href: '/' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'FAQ', href: '/faq' },
  { name: 'About', href: '/company' },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-pm-surface/90 backdrop-blur-xl border-b border-pm-border transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <Image 
              src="/logo.png" 
              alt="STAGE Logo" 
              width={160}
              height={60}
              className="h-20 w-auto object-contain dark-theme-logo group-hover:scale-105 transition-transform" 
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-bold uppercase tracking-wider">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-pm-accent font-black' : 'text-pm-muted hover:text-pm-text'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-[#1D264F] dark:bg-indigo-600 hover:bg-[#253B80] dark:hover:bg-indigo-500 text-white font-mono font-black text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-text hover:bg-pm-surface-3 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-16">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative bg-pm-surface border-b border-pm-border flex flex-col px-6 py-6 gap-4 text-pm-text">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-mono font-bold uppercase tracking-wider py-2 transition-colors ${
                    isActive ? 'text-pm-accent' : 'text-pm-muted hover:text-pm-text'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-5 py-3.5 rounded-2xl bg-pm-accent text-white font-mono font-bold text-xs text-center transition-all shadow-lg shadow-purple-600/20"
            >
              Open Dashboard
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
