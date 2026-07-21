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
  color: string
  snapshot_url?: string
  created_at: string
  marker_count?: number
  markers?: any[]
  top_markers?: Array<{ title?: string; priority: string }>
  priority_distribution?: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface CanvasFlow {
  id: string
  project_id: string
  source_frame_id: string
  target_frame_id: string
  label?: string
  created_at: string
}

interface CanvasStore {
  frames: CanvasFrame[]
  flows: CanvasFlow[]
  selectedFrameId: string | null
  selectedFrame: string | null // legacy compatibility alias
  isLoading: boolean
  error: string | null
  zoom: number
  panX: number
  panY: number

  fetchCanvas: (projectId: string, sessionId?: string) => Promise<void>
  createFrame: (data: {
    project_id: string
    session_id?: string
    title: string
    position_x?: number
    position_y?: number
    width?: number
    height?: number
    color?: string
  }) => Promise<CanvasFrame | undefined>
  updateFramePosition: (id: string, x: number, y: number) => void
  persistFramePosition: (id: string, x: number, y: number) => Promise<void> // legacy compatibility alias
  updateFrameSize: (id: string, w: number, h: number) => void
  deleteFrame: (id: string) => Promise<void>
  createFlow: (data: {
    project_id: string
    source_frame_id: string
    target_frame_id: string
    label?: string
  }) => Promise<CanvasFlow | undefined>
  deleteFlow: (id: string) => Promise<void>
  setSelectedFrame: (id: string | null) => void
  setZoom: (z: number) => void
  setPan: (x: number, y: number) => void
}

const updateTimers: Record<string, any> = {}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  frames: [],
  flows: [],
  selectedFrameId: null,
  selectedFrame: null,
  isLoading: false,
  error: null,
  zoom: 1.0,
  panX: 0,
  panY: 0,

  fetchCanvas: async (projectId, sessionId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.canvas.getCanvas(projectId)
      let frames: CanvasFrame[] = res?.frames || []
      let flows: CanvasFlow[] = res?.flows || []

      // If sessionId is provided, fetch page visits to map graph nodes & flows
      if (sessionId) {
        try {
          const visits: any[] = await api.sessions.getVisits(sessionId)
          if (Array.isArray(visits) && visits.length > 0) {
            const pageMap = new Map<string, string>()

            visits.forEach((visit, idx) => {
              const urlKey = visit.page_url || `page_${visit.id}`
              // Check if a frame already exists for this url / session
              let existingFrame = frames.find(f => f.session_id === sessionId || f.title === visit.page_title)
              
              if (!existingFrame && !pageMap.has(urlKey)) {
                const syntheticId = `frame_visit_${visit.id || idx}`
                const newFrame: CanvasFrame = {
                  id: syntheticId,
                  project_id: projectId,
                  session_id: sessionId,
                  title: visit.page_title || visit.page_url || `Page ${idx + 1}`,
                  position_x: (frames.length + pageMap.size) * 360 + 60,
                  position_y: 120,
                  width: 320,
                  height: 220,
                  color: '#4f98a3',
                  created_at: visit.visited_at || new Date().toISOString()
                }
                frames.push(newFrame)
                pageMap.set(urlKey, newFrame.id)
              } else if (existingFrame) {
                pageMap.set(urlKey, existingFrame.id)
              }
            })

            // Generate flows for sequential visits
            for (let i = 0; i < visits.length - 1; i++) {
              const srcUrl = visits[i].page_url
              const tgtUrl = visits[i + 1].page_url
              const srcId = pageMap.get(srcUrl)
              const tgtId = pageMap.get(tgtUrl)

              if (srcId && tgtId && srcId !== tgtId) {
                const flowExists = flows.some(fl => fl.source_frame_id === srcId && fl.target_frame_id === tgtId)
                if (!flowExists) {
                  flows.push({
                    id: `flow_visit_${i}`,
                    project_id: projectId,
                    source_frame_id: srcId,
                    target_frame_id: tgtId,
                    label: 'Navigation Flow',
                    created_at: new Date().toISOString()
                  })
                }
              }
            }
          }
        } catch (visitErr) {
          console.warn('[CanvasStore] Page visits fetch warning:', visitErr)
        }
      }

      set({
        frames,
        flows,
        selectedFrameId: null,
        selectedFrame: null,
        zoom: 1.0,
        panX: 0,
        panY: 0,
      })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch canvas' })
    } finally {
      set({ isLoading: false })
    }
  },

  createFrame: async (data) => {
    try {
      const newFrame = await api.canvas.createFrame(data)
      set((state) => ({ frames: [...state.frames, newFrame] }))
      return newFrame
    } catch (err: any) {
      set({ error: err.message || 'Failed to create frame' })
    }
  },

  updateFramePosition: (id, x, y) => {
    // 1. Optimistic update
    set((state) => ({
      frames: state.frames.map((f) =>
        f.id === id ? { ...f, position_x: x, position_y: y } : f
      ),
    }))

    // 2. Debounced API save
    if (updateTimers[id]) clearTimeout(updateTimers[id])
    updateTimers[id] = setTimeout(async () => {
      try {
        await api.canvas.updateFrame(id, { position_x: x, position_y: y })
      } catch (err: any) {
        console.error('[CanvasStore] Failed to save frame position:', err)
      }
    }, 500)
  },

  persistFramePosition: async (id, x, y) => {
    // Legacy support, updateFramePosition debounces it already. We just call it.
    get().updateFramePosition(id, x, y)
  },

  updateFrameSize: (id, w, h) => {
    // 1. Optimistic update
    set((state) => ({
      frames: state.frames.map((f) =>
        f.id === id ? { ...f, width: w, height: h } : f
      ),
    }))

    // 2. Debounced API save
    if (updateTimers[id]) clearTimeout(updateTimers[id])
    updateTimers[id] = setTimeout(async () => {
      try {
        await api.canvas.updateFrame(id, { width: w, height: h })
      } catch (err: any) {
        console.error('[CanvasStore] Failed to save frame size:', err)
      }
    }, 500)
  },

  deleteFrame: async (id) => {
    try {
      await api.canvas.deleteFrame(id)
      set((state) => ({
        frames: state.frames.filter((f) => f.id !== id),
        flows: state.flows.filter((fl) => fl.source_frame_id !== id && fl.target_frame_id !== id),
        selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId,
        selectedFrame: state.selectedFrame === id ? null : state.selectedFrame,
      }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete frame' })
    }
  },

  createFlow: async (data) => {
    try {
      const newFlow = await api.canvas.createFlow(data)
      set((state) => ({ flows: [...state.flows, newFlow] }))
      return newFlow
    } catch (err: any) {
      set({ error: err.message || 'Failed to create flow' })
    }
  },

  deleteFlow: async (id) => {
    try {
      await api.canvas.deleteFlow(id)
      set((state) => ({
        flows: state.flows.filter((fl) => fl.id !== id),
      }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete flow' })
    }
  },

  setSelectedFrame: (id) => {
    set({ selectedFrameId: id, selectedFrame: id })
  },

  setZoom: (z) => {
    const clamped = Math.max(0.25, Math.min(2.0, z))
    set({ zoom: clamped })
  },

  setPan: (x, y) => {
    set({ panX: x, panY: y })
  },
}))
