import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (resolvedTheme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('pixelmark_theme', theme);
    }
  },
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
}));
