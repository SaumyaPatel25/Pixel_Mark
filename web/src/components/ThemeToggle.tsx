'use client';

import { useThemeStore } from '@/store/themeStore';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// 1. Segmented control perfect for dropdowns and menus
export function ThemeSegmentedControl() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const options = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'system' as const, label: 'System', icon: Monitor },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
  ];

  return (
    <div className="px-3.5 py-2.5 border-b border-pm-border mb-1 flex flex-col gap-1.5 select-none">
      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-pm-muted">
        Appearance
      </span>
      <div className="grid grid-cols-3 gap-1 bg-pm-surface-2 p-0.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-pm-muted">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                setTheme(opt.value);
              }}
              className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none ${
                isActive
                  ? 'bg-pm-surface text-pm-accent shadow-sm border border-pm-border/30'
                  : 'hover:text-pm-text'
              }`}
              aria-label={`${opt.label} Mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[8.5px] font-mono font-bold tracking-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 2. Click-to-cycle / Dropdown floating selector
export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedSystemTheme, setResolvedSystemTheme] = useState<'light' | 'dark'>('light');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setResolvedSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setResolvedSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEffectiveLabel = () => {
    if (theme === 'system') {
      return resolvedSystemTheme === 'dark' ? 'Dark (default)' : 'Light (default)';
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  const getActiveIcon = () => {
    if (theme === 'light') return Sun;
    if (theme === 'dark') return Moon;
    return Monitor;
  };

  const ActiveIcon = getActiveIcon();
  const options = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3.5 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-text hover:bg-pm-surface hover:border-pm-border-bright flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer select-none active:scale-98"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ActiveIcon className="w-3.5 h-3.5 text-pm-accent" />
        <span>{getEffectiveLabel()}</span>
        <ChevronDown className={`w-3 h-3 text-pm-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-1.5 w-36 rounded-xl bg-pm-surface border border-pm-border shadow-lg z-50 p-1 flex flex-col gap-0.5"
          >
            {options.map((opt) => {
              const OptIcon = opt.icon;
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide cursor-pointer transition-all hover:bg-pm-surface-2 ${
                    isSelected 
                      ? 'text-pm-accent bg-pm-accent-subtle border border-pm-border/30' 
                      : 'text-pm-text hover:text-pm-accent'
                  }`}
                >
                  <OptIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-pm-accent' : 'text-pm-muted'}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
