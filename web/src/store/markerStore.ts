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
  page_url?: string | null
  page_title?: string | null
  renderer_type?: string | null
  canvas_context?: any | null
  marker_number?: number | null
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
  is_inside_shadow_dom?: boolean | null
  shadow_root_depth?: number | null
  shadow_host_tag?: string | null
  shadow_host_id?: string | null
  shadow_host_class_list?: string[] | null
  shadow_path?: string | null
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

// Phase 3 Multi-page State Selectors
export function groupMarkersByPage(markers: Marker[]): Record<string, Marker[]> {
  const grouped: Record<string, Marker[]> = {}
  markers.forEach((m) => {
    const url = m.page_url || m.url || 'Unknown Page'
    if (!grouped[url]) grouped[url] = []
    grouped[url].push(m)
  })
  return grouped
}

export interface UniquePageInfo {
  url: string
  path: string
  title: string
  markerCount: number
  renderers: string[]
}

export function getUniquePages(markers: Marker[]): UniquePageInfo[] {
  const grouped = groupMarkersByPage(markers)
  return Object.entries(grouped).map(([url, list]) => {
    let path = url
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url)
        path = parsed.pathname + parsed.search
      }
    } catch {
      // Fallback
    }
    
    // Clean up empty paths or root paths to show a better label
    if (path === '/' || path === '') {
      path = '/index'
    }

    const title = list[0]?.page_title || list[0]?.title || 'Untitled Page'
    
    const renderers = Array.from(new Set(
      list.map(m => m.renderer_type || 'dom').filter(Boolean)
    )) as string[]

    return {
      url,
      path,
      title,
      markerCount: list.length,
      renderers
    }
  })
}

export function getRendererSummary(markers: Marker[]): Record<string, number> {
  const summary: Record<string, number> = {
    dom: 0,
    shadow_dom: 0,
    canvas2d: 0,
    webgl: 0,
    threejs: 0,
    unknown: 0
  }
  markers.forEach((m) => {
    const r = (m.renderer_type || 'dom').toLowerCase()
    if (r in summary) {
      summary[r]++
    } else {
      summary.unknown = (summary.unknown || 0) + 1
    }
  })
  return summary
}

export function getPageThumbnailMap(markers: Marker[]): Record<string, string> {
  const map: Record<string, string> = {}
  markers.forEach((m) => {
    const url = m.page_url || m.url || 'Unknown Page'
    if (!map[url] && m.screenshot_url) {
      map[url] = m.screenshot_url
    }
  })
  return map
}
