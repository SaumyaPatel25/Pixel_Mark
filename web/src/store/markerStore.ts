import { create } from 'zustand'
import { api, triageSession, summarizeSession } from '@/lib/api'
import { TriageResult, SessionSummary } from '@/types/ai'
import { posthog } from '@/lib/posthog'

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

  triageResult: TriageResult | null
  sessionSummary: SessionSummary | null
  isTriaging: boolean
  isSummarizing: boolean
  triageError: string | null
  summaryError: string | null

  triageSession: (sessionId: string) => Promise<void>
  summarizeSession: (sessionId: string) => Promise<void>
  clearAIState: () => void
}

export const useMarkerStore = create<MarkerStore>((set, get) => ({
  markers: [],
  filtered: [],
  filters: {},
  isLoading: false,

  triageResult: null,
  sessionSummary: null,
  isTriaging: false,
  isSummarizing: false,
  triageError: null,
  summaryError: null,

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

    set({ filtered, filters: newFilters })
  },

  clearFilters: () => {
    set({ filtered: get().markers, filters: {} })
  },

  triageSession: async (sessionId: string) => {
    const marker_count = get().markers.length
    posthog.capture('ai_triage_started', { session_id: sessionId, marker_count })
    set({ isTriaging: true, triageError: null })
    try {
      const res = await triageSession(sessionId)
      
      const triagedMarkers = res.triaged_markers || (res as any).markers || []
      const oldMarkers = get().markers
      
      const newMarkers = oldMarkers.map((m) => {
        const t = triagedMarkers.find(x => x.id === m.id)
        if (t) {
          return { ...m, priority: t.priority as Priority, ai_summary: t.ai_summary }
        }
        return m
      })

      set({ markers: newMarkers, triageResult: res })
      get().setFilter({})
      
      const triaged_count = res.triaged_markers?.length || (res as any).triaged_count || triagedMarkers.length
      posthog.capture('ai_triage_succeeded', { session_id: sessionId, triaged_count })
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase()
      let failure_type: "no_provider" | "provider_unavailable" | "unsupported" | "unknown" = "unknown"
      if (msg.includes("no active default")) {
        failure_type = "no_provider"
      } else if (msg.includes("not implemented") || msg.includes("unsupported")) {
        failure_type = "unsupported"
      } else if (msg.includes("could not reach") || msg.includes("unreachable") || msg.includes("unavailable") || msg.includes("503") || msg.includes("501") || msg.includes("connection failed")) {
        failure_type = "provider_unavailable"
      }
      posthog.capture('ai_triage_failed', { session_id: sessionId, failure_type })
      set({ triageError: err.message || 'Triage failed' })
    } finally {
      set({ isTriaging: false })
    }
  },

  summarizeSession: async (sessionId: string) => {
    posthog.capture('ai_summary_started', { session_id: sessionId })
    set({ isSummarizing: true, summaryError: null })
    try {
      const res = await summarizeSession(sessionId)
      set({ sessionSummary: res })
      
      posthog.capture('ai_summary_succeeded', {
        session_id: sessionId,
        overall_health: res.overall_health,
        total_markers: res.counts ? (res.counts.critical + res.counts.high + res.counts.medium + res.counts.low) : 0
      })
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase()
      let failure_type: "no_provider" | "provider_unavailable" | "unsupported" | "unknown" = "unknown"
      if (msg.includes("no active default")) {
        failure_type = "no_provider"
      } else if (msg.includes("not implemented") || msg.includes("unsupported")) {
        failure_type = "unsupported"
      } else if (msg.includes("could not reach") || msg.includes("unreachable") || msg.includes("unavailable") || msg.includes("503") || msg.includes("501") || msg.includes("connection failed")) {
        failure_type = "provider_unavailable"
      }
      posthog.capture('ai_summary_failed', { session_id: sessionId, failure_type })
      set({ summaryError: err.message || 'Summarization failed' })
    } finally {
      set({ isSummarizing: false })
    }
  },

  clearAIState: () => {
    set({
      triageResult: null,
      sessionSummary: null,
      triageError: null,
      summaryError: null,
    })
  }
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
