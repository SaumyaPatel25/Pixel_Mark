'use client';

import { useEffect } from 'react';
import { useThemeStore, ThemeMode } from '@/store/themeStore';

export function ThemeInitializer() {
  const theme = useThemeStore((state) => state.theme);
  const setResolvedTheme = useThemeStore((state) => state.setResolvedTheme);

  // 1. Sync Zustand state from localStorage on first mount
  // We use setState directly to avoid triggering a redundant localStorage write
  useEffect(() => {
    const savedTheme = (localStorage.getItem('pixelmark_theme') as ThemeMode) || 'system';
    useThemeStore.setState({ theme: savedTheme });
  }, []);

  // 2. React to theme state changes and live OS preference changes
  useEffect(() => {
    const applyThemeToDOM = (resolved: 'light' | 'dark') => {
      const doc = document.documentElement;
      doc.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        doc.classList.add('dark');
        doc.classList.remove('light');
      } else {
        doc.classList.add('light');
        doc.classList.remove('dark');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Resolve current theme
    let resolved: 'light' | 'dark' = 'light';
    if (theme === 'system') {
      resolved = mediaQuery.matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    // Apply resolved theme
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);

    // Setup live OS listener
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const currentTheme = useThemeStore.getState().theme;
      // Only react to OS changes if the user hasn't explicitly chosen light or dark
      if (currentTheme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyThemeToDOM(newResolved);
      }
    };

    try {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } catch {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } catch {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [theme, setResolvedTheme]);

  return null;
}
