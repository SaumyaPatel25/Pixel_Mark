import { create } from 'zustand'
import { Marker, SessionSocketEvent } from '@/types/markers'
import { api } from '@/lib/api'

interface MarkerStoreState {
  markersById: Record<string, Marker>
  orderedMarkerIds: string[]
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  lastSnapshotAt: string | null
  selectedMarkerId: string | null
  currentSessionId: string | null
  activeSessionId: string | null
  filters: {
    status: 'all' | 'open' | 'resolved'
    priority: 'all' | 'critical' | 'high' | 'medium' | 'low'
    creatorId: 'all' | string
  }
  participants: any[]

  // Actions
  loadSessionMarkers: (sessionId: string) => Promise<void>
  applySnapshot: (markers: Marker[]) => void
  upsertMarkerFromServer: (marker: Marker, force?: boolean) => void
  removeMarkerFromServer: (markerId: string) => void
  createMarkerViaApi: (sessionId: string, payload: any, xReviewerId?: string) => Promise<Marker>
  updateMarkerViaApi: (markerId: string, patch: any, xReviewerId?: string) => Promise<Marker>
  moveMarkerViaApi: (markerId: string, patch: any, xReviewerId?: string) => Promise<Marker>
  deleteMarkerViaApi: (markerId: string, xReviewerId?: string) => Promise<void>
  handleRealtimeEvent: (event: SessionSocketEvent) => void
  reconcileSession: (sessionId: string) => Promise<void>
  resetForSessionChange: (sessionId: string) => void
  setSelectedMarkerId: (id: string | null) => void
  selectMarker: (id: string | null) => void
  setFilters: (filters: Partial<MarkerStoreState['filters']>) => void
  setConnectionStatus: (status: MarkerStoreState['connectionStatus']) => void

  // Derived Selectors
  getMarkersForSession: (sessionId: string) => Marker[]
  getMarkersForPage: (pageUrlOrVisitId: string) => Marker[]
  getVisibleMarkers: () => Marker[]
  getMarkerStats: () => { total: number; open: number; resolved: number; critical: number; high: number; medium: number; low: number }
  getMarkersGroupedByCreator: () => Record<string, Marker[]>
  getMarkersGroupedByStatus: () => Record<string, Marker[]>
  getMarkersGroupedByPage: () => Record<string, { pageTitle: string; markers: Marker[] }>
}

export const useMarkerStore = create<MarkerStoreState>((set, get) => ({
  markersById: {},
  orderedMarkerIds: [],
  connectionStatus: 'disconnected',
  lastSnapshotAt: null,
  selectedMarkerId: null,
  currentSessionId: null,
  activeSessionId: null,
  filters: {
    status: 'all',
    priority: 'all',
    creatorId: 'all',
  },
  participants: [],

  setSelectedMarkerId: (id) => set({ selectedMarkerId: id }),
  selectMarker: (id) => set({ selectedMarkerId: id }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  resetForSessionChange: (sessionId) => {
    set({
      currentSessionId: sessionId,
      activeSessionId: sessionId,
      markersById: {},
      orderedMarkerIds: [],
      selectedMarkerId: null,
      lastSnapshotAt: null,
      filters: {
        status: 'all',
        priority: 'all',
        creatorId: 'all',
      },
      participants: [],
    })
  },

  loadSessionMarkers: async (sessionId) => {
    try {
      const markers = await api.markers.list(sessionId)
      get().applySnapshot(markers)
    } catch (err) {
      console.error('[MarkerStore] Failed to load session markers:', err)
    }
  },

  applySnapshot: (markers) => {
    const activeMarkers = markers.filter((m) => !m.is_deleted)
    // Deterministic sort: created_at asc, id asc
    activeMarkers.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.id.localeCompare(b.id)
    })

    const markersById: Record<string, Marker> = {}
    markers.forEach((m) => {
      markersById[m.id] = m
    })

    set({
      markersById,
      orderedMarkerIds: activeMarkers.map((m) => m.id),
      lastSnapshotAt: new Date().toISOString(),
    })
  },

  upsertMarkerFromServer: (marker, force = false) => {
    set((state) => {
      const existing = state.markersById[marker.id]
      // Stale event guard: ignore incoming version if older than local version
      if (!force && existing && marker.version <= existing.version) {
        return state
      }

      const markersById = { ...state.markersById, [marker.id]: marker }
      
      // Update orderedMarkerIds
      let orderedMarkerIds = [...state.orderedMarkerIds]
      if (marker.is_deleted) {
        orderedMarkerIds = orderedMarkerIds.filter((id) => id !== marker.id)
      } else {
        if (!orderedMarkerIds.includes(marker.id)) {
          orderedMarkerIds.push(marker.id)
        }
        // Resort to maintain deterministic order
        orderedMarkerIds.sort((idA, idB) => {
          const mA = markersById[idA]
          const mB = markersById[idB]
          if (!mA || !mB) return 0
          const timeA = new Date(mA.created_at).getTime()
          const timeB = new Date(mB.created_at).getTime()
          if (timeA !== timeB) return timeA - timeB
          return mA.id.localeCompare(mB.id)
        })
      }

      return { markersById, orderedMarkerIds }
    })
  },

  removeMarkerFromServer: (markerId) => {
    set((state) => {
      const markersById = { ...state.markersById }
      if (markersById[markerId]) {
        markersById[markerId] = { ...markersById[markerId], is_deleted: true }
      }
      const orderedMarkerIds = state.orderedMarkerIds.filter((id) => id !== markerId)
      return { markersById, orderedMarkerIds }
    })
  },

  createMarkerViaApi: async (sessionId, payload, xReviewerId) => {
    // Writes go strictly through REST
    const created = await api.markers.create(sessionId, payload, xReviewerId)
    // Server broadcast will announce this, but we immediately insert it locally
    get().upsertMarkerFromServer(created)
    return created
  },

  updateMarkerViaApi: async (markerId, patch, xReviewerId) => {
    const existing = get().markersById[markerId]
    const expected_version = existing ? existing.version : undefined
    
    // Save original for rollback if request fails
    const original = existing ? { ...existing } : null

    // Optimistically update version and title/desc to avoid lag
    if (existing) {
      const optimisticMarker = {
        ...existing,
        ...patch,
        version: existing.version + 1,
      }
      get().upsertMarkerFromServer(optimisticMarker)
    }

    try {
      const updated = await api.markers.update(markerId, { ...patch, expected_version }, xReviewerId)
      get().upsertMarkerFromServer(updated)
      return updated
    } catch (err) {
      // Rollback on error
      if (original) {
        get().upsertMarkerFromServer(original, true)
      }
      throw err
    }
  },

  moveMarkerViaApi: async (markerId, patch, xReviewerId) => {
    const existing = get().markersById[markerId]
    const expected_version = existing ? existing.version : undefined
    
    // Save original for rollback
    const original = existing ? { ...existing } : null

    // Ephemeral position update
    if (existing) {
      const optimisticMarker = {
        ...existing,
        ...patch,
        version: existing.version + 1,
      }
      get().upsertMarkerFromServer(optimisticMarker)
    }

    try {
      const updated = await api.markers.patchPosition(markerId, { ...patch, expected_version }, xReviewerId)
      get().upsertMarkerFromServer(updated)
      return updated
    } catch (err) {
      if (original) {
        get().upsertMarkerFromServer(original, true)
      }
      throw err
    }
  },

  deleteMarkerViaApi: async (markerId, xReviewerId) => {
    const existing = get().markersById[markerId]
    const original = existing ? { ...existing } : null

    // Optimistically remove from list
    get().removeMarkerFromServer(markerId)

    try {
      await api.markers.delete(markerId, xReviewerId)
    } catch (err) {
      // Rollback on error
      if (original) {
        get().upsertMarkerFromServer(original, true)
      }
      throw err
    }
  },

  handleRealtimeEvent: (event) => {
    switch (event.type) {
      case 'marker_created':
      case 'marker_updated':
      case 'marker_moved':
      case 'marker_resolved':
        if (event.data?.marker) {
          get().upsertMarkerFromServer(event.data.marker)
        }
        break
      case 'marker_deleted':
        if (event.marker_id) {
          get().removeMarkerFromServer(event.marker_id)
        }
        break
      case 'session_snapshot':
        if (event.data?.markers) {
          get().applySnapshot(event.data.markers)
        }
        break
      case 'session_reconciled':
        console.log('[MarkerStore] Realtime session reconciled:', event.data?.message)
        break
      case 'presence_updated':
        if (event.data?.participants) {
          set({ participants: event.data.participants })
        }
        break
      default:
        break
    }
  },

  reconcileSession: async (sessionId) => {
    // Re-fetch markers from REST to ensure complete convergence with source of truth
    await get().loadSessionMarkers(sessionId)
  },

  // Derived Selectors Implementation
  getMarkersForSession: (sessionId) => {
    return Object.values(get().markersById).filter(m => m.session_id === sessionId && !m.is_deleted)
  },

  getMarkersForPage: (pageUrlOrVisitId) => {
    return Object.values(get().markersById).filter(m => 
      (m.page_url === pageUrlOrVisitId || m.page_visit_id === pageUrlOrVisitId) && !m.is_deleted
    )
  },

  getVisibleMarkers: () => {
    const { markersById, orderedMarkerIds, filters } = get()
    return orderedMarkerIds
      .map(id => markersById[id])
      .filter(m => {
        if (!m || m.is_deleted) return false
        if (filters.status !== 'all' && m.status !== filters.status) return false
        if (filters.priority !== 'all' && m.priority !== filters.priority) return false
        if (filters.creatorId && filters.creatorId !== 'all' && m.creator_id !== filters.creatorId && m.creator_name !== filters.creatorId) return false
        return true
      })
  },

  getMarkerStats: () => {
    const markers = Object.values(get().markersById).filter(m => !m.is_deleted)
    const stats = {
      total: markers.length,
      open: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
    markers.forEach(m => {
      if (m.status === 'open') stats.open++
      else if (m.status === 'resolved') stats.resolved++
      
      if (m.priority === 'critical') stats.critical++
      else if (m.priority === 'high') stats.high++
      else if (m.priority === 'medium') stats.medium++
      else if (m.priority === 'low') stats.low++
    })
    return stats
  },

  getMarkersGroupedByCreator: () => {
    const markers = Object.values(get().markersById).filter(m => !m.is_deleted)
    const groups: Record<string, Marker[]> = {}
    markers.forEach(m => {
      const creator = m.creator_name || m.creator_id || 'Anonymous'
      if (!groups[creator]) groups[creator] = []
      groups[creator].push(m)
    })
    return groups
  },

  getMarkersGroupedByStatus: () => {
    const markers = Object.values(get().markersById).filter(m => !m.is_deleted)
    const groups: Record<string, Marker[]> = { open: [], resolved: [] }
    markers.forEach(m => {
      if (m.status === 'open') groups.open.push(m)
      else if (m.status === 'resolved') groups.resolved.push(m)
    })
    return groups
  },

  getMarkersGroupedByPage: () => {
    const markers = Object.values(get().markersById).filter(m => !m.is_deleted)
    const groups: Record<string, { pageTitle: string; markers: Marker[] }> = {}
    markers.forEach(m => {
      const pageKey = m.page_url || 'Unknown Page'
      if (!groups[pageKey]) {
        groups[pageKey] = {
          pageTitle: m.page_title || 'Untitled Page',
          markers: []
        }
      }
      groups[pageKey].markers.push(m)
    })
    return groups
  }
}))
