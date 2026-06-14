import { create } from 'zustand';

interface UIState {
  isCommandCenterOpen: boolean;
  isExportPanelOpen: boolean;
  isDesignSystemOpen: boolean;
  isSharePanelOpen: boolean;
  isAnalyticsOpen: boolean;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  
  toggleCommandCenter: (open?: boolean) => void;
  toggleExportPanel: (open?: boolean) => void;
  toggleDesignSystem: (open?: boolean) => void;
  toggleSharePanel: (open?: boolean) => void;
  toggleAnalytics: (open?: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCommandCenterOpen: true,
  isExportPanelOpen: false,
  isDesignSystemOpen: false,
  isSharePanelOpen: false,
  isAnalyticsOpen: false,
  toasts: [],
  
  toggleCommandCenter: (open) => set((state) => ({ 
    isCommandCenterOpen: open !== undefined ? open : !state.isCommandCenterOpen 
  })),
  toggleExportPanel: (open) => set((state) => ({ 
    isExportPanelOpen: open !== undefined ? open : !state.isExportPanelOpen 
  })),
  toggleDesignSystem: (open) => set((state) => ({
    isDesignSystemOpen: open !== undefined ? open : !state.isDesignSystemOpen
  })),
  toggleSharePanel: (open) => set((state) => ({
    isSharePanelOpen: open !== undefined ? open : !state.isSharePanelOpen
  })),
  toggleAnalytics: (open) => set((state) => ({
    isAnalyticsOpen: open !== undefined ? open : !state.isAnalyticsOpen
  })),
  addToast: (message, type) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ 
      toasts: [...state.toasts, { id, message, type }] 
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ 
    toasts: state.toasts.filter(t => t.id !== id) 
  })),
}));
