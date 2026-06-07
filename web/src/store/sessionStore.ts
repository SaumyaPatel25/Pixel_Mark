import { create } from 'zustand';

interface SessionState {
  renderer_type: string;
  heavy_mode: boolean;
  setRendererType: (type: string) => void;
  setHeavyMode: (heavy: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  renderer_type: 'dom',
  heavy_mode: false,
  setRendererType: (type) => set({ 
    renderer_type: type, 
    heavy_mode: type !== 'dom' 
  }),
  setHeavyMode: (heavy) => set({ heavy_mode: heavy }),
}));
