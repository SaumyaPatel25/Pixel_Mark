import { create } from 'zustand'
import { api } from '@/lib/api'

export interface CanvasFrame {
  id: string
  project_id: string
  session_id?: string
  title: string
  position_x: number
  position_y: number
  width: number
  height: number
  snapshot_url?: string
  markers?: any[]
}

export interface CanvasFlow {
  id: string
  name: string
  frame_sequence: string[]
}

interface CanvasStore {
  frames: CanvasFrame[]
  flows: CanvasFlow[]
  selectedFrame: string | null
  isLoading: boolean
  fetchCanvas: (projectId: string) => Promise<void>
  updateFramePosition: (id: string, x: number, y: number) => void
  persistFramePosition: (id: string, x: number, y: number) => Promise<void>
  setSelectedFrame: (id: string | null) => void
  addFrame: (frame: CanvasFrame) => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  frames: [],
  flows: [],
  selectedFrame: null,
  isLoading: false,

  fetchCanvas: async (projectId) => {
    set({ isLoading: true })
    try {
      const res = await api.canvas.getCanvas(projectId)
      set({
        frames: res?.frames || [],
        flows: res?.flows || [],
        selectedFrame: null,
      })
    } catch {
      // Mock fallback for testing pan/zoom frames if endpoint is not integrated fully yet
      set({
        frames: [
          {
            id: 'frame-1',
            project_id: projectId,
            title: 'Landing Page Viewport',
            position_x: 100,
            position_y: 120,
            width: 320,
            height: 200,
            snapshot_url: '',
            markers: [{ priority: 'critical' }, { priority: 'high' }],
          },
          {
            id: 'frame-2',
            project_id: projectId,
            title: 'Pricing Page Grid View',
            position_x: 500,
            position_y: 180,
            width: 320,
            height: 200,
            snapshot_url: '',
            markers: [{ priority: 'medium' }],
          },
        ],
        flows: [
          {
            id: 'flow-1',
            name: 'Check Out Conversion Funnel',
            frame_sequence: ['frame-1', 'frame-2'],
          },
        ],
        selectedFrame: null,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  updateFramePosition: (id, x, y) => {
    set((state) => ({
      frames: state.frames.map((f) =>
        f.id === id ? { ...f, position_x: x, position_y: y } : f
      ),
    }))
  },

  persistFramePosition: async (id, x, y) => {
    try {
      await api.canvas.updateFrame(id, { position_x: x, position_y: y })
    } catch {
      // Quiet fail or logged, state remains optimistic
    }
  },

  setSelectedFrame: (id) => {
    set({ selectedFrame: id })
  },

  addFrame: (frame) => {
    set((state) => ({ frames: [...state.frames, frame] }))
  },
}))
