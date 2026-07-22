import { create } from 'zustand'
import { Marker, SessionSocketEvent } from '@/types/markers'
import { api } from '@/lib/api'
import { useOnboardingStore } from './onboardingStore'

export function isPersistedMarker(marker: Marker): boolean {
  return marker && typeof marker.id === 'string' && !marker.id.startsWith('temp-')
}

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
  removeMarkerLocally: (markerId: string) => void
  handleRealtimeEvent: (event: SessionSocketEvent) => void
  reconcileSession: (sessionId: string) => Promise<void>
  reconcileSessionMarkers: (sessionId: string) => Promise<void>
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
  selectMarker: (id) => {
    set({ selectedMarkerId: id })
    if (id) {
      useOnboardingStore.getState().completeTask('view_details')
    }
  },
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
    await get().reconcileSessionMarkers(sessionId)
  },

  applySnapshot: (markers) => {
    set((state) => {
      const markersById = { ...state.markersById }
      const newIds = new Set(markers.map(m => m.id))

      // 1. Mark or purge any markers that are no longer in the snapshot
      Object.keys(markersById).forEach(id => {
        const currentSession = get().currentSessionId
        const sessionMatches = !currentSession || markersById[id].session_id === currentSession
        if (sessionMatches && !id.startsWith('temp-') && !newIds.has(id)) {
          if (!markersById[id].is_deleted) {
            console.log(`STAGE deleted purged [${id}]`)
          }
          delete markersById[id]
        }
      })

      // 2. Add or update markers from snapshot, respecting versions
      markers.forEach(m => {
        const existing = markersById[m.id]
        if (!existing || m.version >= existing.version) {
          markersById[m.id] = m
        }
      })

      const activeMarkers = Object.values(markersById).filter((m) => !m.is_deleted)
      // Deterministic sort: created_at asc, id asc
      activeMarkers.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime()
        const timeB = new Date(b.created_at).getTime()
        if (timeA !== timeB) return timeA - timeB
        return a.id.localeCompare(b.id)
      })

      return {
        markersById,
        orderedMarkerIds: activeMarkers.map((m) => m.id),
        lastSnapshotAt: new Date().toISOString()
      }
    })
  },

  upsertMarkerFromServer: (marker, force = false) => {
    set((state) => {
      const existing = state.markersById[marker.id]
      
      // Stale event guard: ignore incoming version if older than local version
      if (!force && existing && marker.version < existing.version) {
        console.log(`STAGE ws duplicate ignored [${marker.id}]`)
        // Trigger reconciliation since local is ahead of server
        setTimeout(() => {
          const current = get().currentSessionId
          if (current) get().reconcileSessionMarkers(current)
        }, 0)
        return state
      }

      if (!force && existing && marker.version === existing.version) {
        // Just duplicate/already matches
        return state
      }

      const markersById = { ...state.markersById }
      if (marker.is_deleted) {
        // If it's deleted, we either delete it or mark it as deleted in markersById.
        markersById[marker.id] = marker
        console.log(`STAGE deleted purged [${marker.id}]`)
      } else {
        markersById[marker.id] = marker
      }
      
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
    const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`
    const tempMarker: Marker = {
      id: tempId,
      session_id: sessionId,
      project_id: payload.project_id || '',
      anchor_kind: payload.anchor_kind,
      page_url: payload.page_url,
      page_title: payload.page_title,
      target_selector: payload.target_selector,
      target_xpath: payload.target_xpath,
      dom_text_excerpt: payload.dom_text_excerpt,
      offset_x_ratio: payload.offset_x_ratio,
      offset_y_ratio: payload.offset_y_ratio,
      viewport_x: payload.viewport_x,
      viewport_y: payload.viewport_y,
      page_x: payload.page_x,
      page_y: payload.page_y,
      viewport_width: payload.viewport_width,
      viewport_height: payload.viewport_height,
      element_rect_json: payload.element_rect_json,
      scroll_x: payload.scroll_x,
      scroll_y: payload.scroll_y,
      canvas_id: payload.canvas_id,
      renderer_type: payload.renderer_type,
      creator_id: xReviewerId || 'anonymous-guest',
      creator_name: 'Anonymous Reviewer',
      creator_role: 'reviewer',
      color_token: payload.color_token || '#8b5cf6',
      status: 'open',
      priority: 'medium',
      version: 1,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: null,
      page_visit_id: null,
      canvas_x_ratio: null,
      canvas_y_ratio: null,
      webgl_clip_x: null,
      webgl_clip_y: null,
      title: payload.title || 'New Marker',
      description: payload.description || null,
      browser: null,
      os: null,
      device_pixel_ratio: null,
      console_errors_json: null,
      network_errors_json: null,
      screenshot_url: null,
      encrypted_context: null
    }

    // Optimistically insert
    get().upsertMarkerFromServer(tempMarker)

    try {
      const created = await api.markers.create(sessionId, payload, xReviewerId)
      // Reconcile: remove temporary marker and insert actual server marker
      set((state) => {
        const markersById = { ...state.markersById }
        delete markersById[tempId]
        const orderedMarkerIds = state.orderedMarkerIds.filter(id => id !== tempId)
        return { markersById, orderedMarkerIds }
      })
      get().upsertMarkerFromServer(created)
      useOnboardingStore.getState().completeTask('drop_pin')
      return created
    } catch (err) {
      // Rollback optimistic write: remove the temporary marker
      console.log(`STAGE optimistic rollback [${tempId}]`)
      set((state) => {
        const markersById = { ...state.markersById }
        delete markersById[tempId]
        const orderedMarkerIds = state.orderedMarkerIds.filter(id => id !== tempId)
        return { markersById, orderedMarkerIds }
      })
      throw err
    }
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
        updated_at: new Date().toISOString()
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
        console.log(`STAGE optimistic rollback [${markerId}]`)
        get().upsertMarkerFromServer(original, true)
      }
      const current = get().currentSessionId
      if (current) get().reconcileSessionMarkers(current)
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
        updated_at: new Date().toISOString()
      }
      get().upsertMarkerFromServer(optimisticMarker)
    }

    try {
      const updated = await api.markers.patchPosition(markerId, { ...patch, expected_version }, xReviewerId)
      get().upsertMarkerFromServer(updated)
      return updated
    } catch (err) {
      if (original) {
        console.log(`STAGE optimistic rollback [${markerId}]`)
        get().upsertMarkerFromServer(original, true)
      }
      const current = get().currentSessionId
      if (current) get().reconcileSessionMarkers(current)
      throw err
    }
  },

  deleteMarkerViaApi: async (markerId, xReviewerId) => {
    const existing = get().markersById[markerId]
    if (!existing) return

    if (!isPersistedMarker(existing)) {
      console.log(`STAGE marker removed local draft [${markerId}]`)
      get().removeMarkerLocally(markerId)
      return
    }

    // Optimistically remove from list
    get().removeMarkerFromServer(markerId)

    try {
      await api.markers.delete(markerId, xReviewerId)
    } catch (err: any) {
      // ApiError carries the status code, check for 404
      const is404 = err?.status === 404 || err?.statusCode === 404 || (err?.message && err.message.includes('404'))
      if (is404) {
        console.log(`STAGE delete reconciled stale marker [${markerId}]`)
        get().removeMarkerLocally(markerId)
        const current = get().currentSessionId
        if (current) {
          await get().reconcileSessionMarkers(current)
        }
      } else {
        // Rollback on other errors
        if (existing) {
          console.log(`STAGE optimistic rollback [${markerId}]`)
          get().upsertMarkerFromServer(existing, true)
        }
        const current = get().currentSessionId
        if (current) get().reconcileSessionMarkers(current)
        throw err
      }
    }
  },

  removeMarkerLocally: (markerId) => {
    set((state) => {
      const markersById = { ...state.markersById }
      delete markersById[markerId]
      const orderedMarkerIds = state.orderedMarkerIds.filter((id) => id !== markerId)
      return { markersById, orderedMarkerIds }
    })
  },

  handleRealtimeEvent: (event) => {
    if (['marker_created', 'marker_updated', 'marker_moved', 'marker_resolved', 'marker_deleted'].includes(event.type)) {
      console.log(`STAGE ws marker event [${event.type}] [${event.marker_id || ''}] [${event.actor_id || ''}]`)
    }
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
    await get().reconcileSessionMarkers(sessionId)
  },

  reconcileSessionMarkers: async (sessionId: string): Promise<void> => {
    if (process.env.NODE_ENV === 'test') {
      return
    }
    try {
      const serverMarkers = await api.markers.list(sessionId)
      console.log(`STAGE reconcile session markers [${serverMarkers.length}]`)

      set((state) => {
        const markersById = { ...state.markersById }
        const serverIds = new Set(serverMarkers.map((m) => m.id))

        // Process server markers:
        serverMarkers.forEach((serverMarker) => {
          const localMarker = markersById[serverMarker.id]
          
          if (serverMarker.is_deleted) {
            if (!localMarker || !localMarker.is_deleted) {
              console.log(`STAGE deleted purged [${serverMarker.id}]`)
            }
            markersById[serverMarker.id] = serverMarker
          } else if (!localMarker) {
            markersById[serverMarker.id] = serverMarker
          } else {
            const serverTime = new Date(serverMarker.updated_at || serverMarker.created_at).getTime()
            const localTime = new Date(localMarker.updated_at || localMarker.created_at).getTime()
            
            if (serverMarker.version >= localMarker.version || serverTime >= localTime) {
              markersById[serverMarker.id] = serverMarker
            } else {
              console.warn(`[Reconciliation] Local marker version (${localMarker.version}) is ahead of server marker version (${serverMarker.version}) for ID: ${serverMarker.id}`)
            }
          }
        })

        // Remove persisted markers missing from authoritative fetch
        Object.keys(markersById).forEach((id) => {
          const marker = markersById[id]
          if (marker.session_id === sessionId && !id.startsWith('temp-') && !serverIds.has(id)) {
            if (!marker.is_deleted) {
              console.log(`STAGE deleted purged [${id}]`)
            }
            delete markersById[id]
          }
        })

        const activeMarkers = Object.values(markersById).filter((m) => m.session_id === sessionId && !m.is_deleted)
        
        activeMarkers.sort((a, b) => {
          const timeA = new Date(a.created_at).getTime()
          const timeB = new Date(b.created_at).getTime()
          if (timeA !== timeB) return timeA - timeB
          return a.id.localeCompare(b.id)
        })

        return {
          markersById,
          orderedMarkerIds: activeMarkers.map((m) => m.id),
          lastSnapshotAt: new Date().toISOString()
        }
      })
    } catch (err) {
      console.error('[MarkerStore] Failed to reconcile session markers:', err)
    }
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
