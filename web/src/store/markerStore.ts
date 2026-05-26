import { create } from 'zustand'
import { api } from '@/lib/api'

export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Status = 'open' | 'in_progress' | 'resolved'

export interface Marker {
  id: string
  session_id: string
  title?: string | null
  description?: string | null
  url?: string | null
  xpath?: string | null
  css_selector?: string | null
  inner_text?: string | null
  viewport?: { width: number; height: number } | null
  browser?: string | null
  os?: string | null
  scroll_position?: { x: number; y: number } | null
  console_errors?: string[] | null
  network_errors?: any[] | null
  screenshot_url?: string | null
  priority: Priority
  status: Status
  ai_summary?: string | null
  created_at: string
}

interface MarkerStore {
  markers: Marker[]
  filtered: Marker[]
  filters: {
    status?: Status
    priority?: Priority
    browser?: string
  }
  isLoading: boolean
  fetchMarkers: (sessionId: string) => Promise<void>
  updateMarker: (id: string, data: Partial<Marker>) => Promise<void>
  deleteMarker: (id: string) => Promise<void>
  setFilter: (filters: Partial<MarkerStore['filters']>) => void
  clearFilters: () => void
}

export const useMarkerStore = create<MarkerStore>((set, get) => ({
  markers: [],
  filtered: [],
  filters: {},
  isLoading: false,

  fetchMarkers: async (sessionId) => {
    set({ isLoading: true })
    try {
      const res = await api.markers.getMarkers(sessionId)
      set({ markers: res || [], filtered: res || [], filters: {} })
    } finally {
      set({ isLoading: false })
    }
  },

  updateMarker: async (id, data) => {
    // Optimistic Update
    const oldMarkers = get().markers
    const updatedMarkers = oldMarkers.map((m) =>
      m.id === id ? { ...m, ...data } : m
    )
    set({ markers: updatedMarkers })
    get().setFilter({}) // Refresh filters

    try {
      await api.markers.updateMarker(id, data)
    } catch (err) {
      // Rollback
      set({ markers: oldMarkers })
      get().setFilter({})
      throw err
    }
  },

  deleteMarker: async (id) => {
    const oldMarkers = get().markers
    set({ markers: oldMarkers.filter((m) => m.id !== id) })
    get().setFilter({})

    try {
      await api.markers.deleteMarker(id)
    } catch (err) {
      set({ markers: oldMarkers })
      get().setFilter({})
      throw err
    }
  },

  setFilter: (newFilters) => {
    const updatedFilters = { ...get().filters, ...newFilters }
    set({ filters: updatedFilters })

    const { markers } = get()
    const filtered = markers.filter((m) => {
      if (updatedFilters.status && m.status !== updatedFilters.status) return false
      if (updatedFilters.priority && m.priority !== updatedFilters.priority) return false
      if (
        updatedFilters.browser &&
        (!m.browser || !m.browser.toLowerCase().includes(updatedFilters.browser.toLowerCase()))
      )
        return false
      return true
    })

    set({ filtered })
  },

  clearFilters: () => {
    set({ filters: {}, filtered: get().markers })
  },
}))
