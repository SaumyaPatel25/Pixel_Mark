import { create } from 'zustand'
import { CapturePayload, normalizeCapturePayload, normalizeMarkerCoordinates } from '../utils/normalizeCapturePayload'
import { useScreenshotStore } from './screenshotStore'
import { useMarkerStore } from './markerStore'
import { api } from '@/lib/api'

export type CaptureStatus = 'draft' | 'submitted' | 'failed' | 'resolved' | 'archived'

// ─── PART 1 & PART 7: Storage Reset and Cleanup ─────────────────────────────
const performOneTimeCleanup = () => {
  if (typeof window === 'undefined') return

  const CURRENT_VERSION = '3'
  const versionKey = 'pixelmark_marker_store_version'
  const cleanupCompleteKey = 'pixelmark_marker_cleanup_complete'

  const currentStoredVersion = localStorage.getItem(versionKey)
  const cleanupComplete = localStorage.getItem(cleanupCompleteKey)

  if (currentStoredVersion !== CURRENT_VERSION || !cleanupComplete) {
    console.log('[Markers] running marker store cleanup...')
    
    // Clear old marker local storage keys
    const keysToClear = [
      'pixelmark_markers',
      'pm_markers',
      'pins',
      'captures',
      'pixelmark_deleted_markers_v1',
      'deleted_pins',
      'pixelmark_deleted_markers'
    ]

    keysToClear.forEach(key => {
      localStorage.removeItem(key)
    })

    // Also reset version 2 tombstone list to start clean
    localStorage.removeItem('pixelmark_deleted_markers_v2')
    localStorage.removeItem('pixelmark_deleted_markers_v3')

    // Set cleanup complete marker
    localStorage.setItem(versionKey, CURRENT_VERSION)
    localStorage.setItem(cleanupCompleteKey, 'true')

    console.log('[Markers] cleanup complete')
  }
}

// Run cleanup immediately upon import
if (typeof window !== 'undefined') {
  performOneTimeCleanup()
}

// Helper to get active tombstoned marker IDs
const getTombstonedMarkerIds = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const deletedStr = localStorage.getItem('pixelmark_deleted_markers_v3')
    return deletedStr ? JSON.parse(deletedStr) : []
  } catch (e) {
    return []
  }
}

// ─── PART 6: Pin Deletion Flow Helper ────────────────────────────────────────
export const deleteMarker = async (id: string) => {
  console.log(`[Markers] deleted id=${id}`)

  // Check if it was a local draft (no persisted ID or status is draft) BEFORE removing it from the store
  const pin = usePinStore.getState().pins.find(p => p.id === id)
  const isDraft = !pin || pin.status === 'draft' || !pin.persistedId

  // 1. Remove from local overlay store state
  usePinStore.getState().removePin(id)

  // 2. Remove from useMarkerStore if it exists
  try {
    const markerStore = useMarkerStore.getState()
    if (markerStore && markerStore.markers) {
      useMarkerStore.setState({
        markers: markerStore.markers.filter(m => m.id !== id),
        filtered: markerStore.filtered.filter(m => m.id !== id)
      })
    }
  } catch (e) {
    // Ignore if not loaded
  }

  if (!isDraft) {
    // 3. Persist deletion in cleanup-safe versioned tombstone list
    if (typeof window !== 'undefined') {
      try {
        const deletedIds = getTombstonedMarkerIds()
        if (!deletedIds.includes(id)) {
          deletedIds.push(id)
          localStorage.setItem('pixelmark_deleted_markers_v3', JSON.stringify(deletedIds))
        }
      } catch (e) {
        console.error('[Markers] failed to persist tombstone:', e)
      }
    }

    // 4. Asynchronously send delete call to backend
    try {
      await api.markers.deleteMarker(id)
    } catch (err) {
      console.warn('[Markers] backend delete failed, but marker was removed locally:', err)
    }
  }
}

export type PinStoreState = {
  pins: CapturePayload[]
  activePinId: string | null
  createPin: (payload: any) => string
  openPin: (id: string | null) => void
  updatePin: (id: string, patch: Partial<CapturePayload>) => void
  removePin: (id: string) => void
  hydratePersistedFeedback: (items: any[]) => void
}

// ─── PART 2: Single Source of Truth for Markers ─────────────────────────────
export const usePinStore = create<PinStoreState>((set, get) => ({
  pins: [],
  activePinId: null,

  createPin: (raw) => {
    const payload = normalizeCapturePayload(raw)
    const id = payload.id

    // Compute coordinates once using the helper
    const stable = normalizeMarkerCoordinates(payload)
    payload.displayX = stable.displayX
    payload.displayY = stable.displayY
    payload.pageX = stable.pageX
    payload.pageY = stable.pageY
    
    set((state) => {
      const exists = state.pins.some(p => p.id === id)
      let nextPins = [...state.pins]
      if (exists) {
        nextPins = nextPins.map(p => p.id === id ? { ...p, ...payload } : p)
      } else {
        nextPins.push(payload)
      }
      console.log(`[Markers] created id=${id} x=${payload.displayX} y=${payload.displayY} source=${stable.source}`)
      return { pins: nextPins }
    })
    return id
  },

  openPin: (id) => {
    set({ activePinId: id })
    if (id) {
      console.log(`[Markers] opened id=${id}`)
    }
  },

  updatePin: (id, patch) => {
    set((state) => ({
      pins: state.pins.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)
    }))
  },

  removePin: (id) => {
    set((state) => ({
      pins: state.pins.map(p => 
        p.id === id ? { ...p, deletedAt: new Date().toISOString(), visible: false } : p
      ).filter(p => p.id !== id),
      activePinId: state.activePinId === id ? null : state.activePinId
    }))
  },

  hydratePersistedFeedback: (items) => {
    const deletedIds = getTombstonedMarkerIds()

    set((state) => {
      const nextPins = [...state.pins]
      items.forEach((item) => {
        const id = item.id || item.capturepayload?.id

        // Filter out deleted markers immediately
        if (item.deletedAt || item.deleted_at || deletedIds.includes(id)) {
          console.log(`[Markers] skipped stale marker id=${id}`)
          return
        }

        const payload = normalizeCapturePayload({
          id,
          status: item.status,
          createdVia: item.createdvia || item.created_via,
          timestamp: item.createdat || item.created_at,
          sessionId: item.sessionid || item.session_id,
          pageUrl: item.pageurl || item.page_url,
          pageTitle: item.pagetitle || item.page_title,
          rendererType: item.renderertype || item.renderer_type,
          issueType: item.issuetype || item.issue_type,
          priority: item.priority,
          userComment: item.comment,
          deletedAt: item.deletedAt || item.deleted_at || null,
          title: item.title,
          description: item.description,
          ...item.capturepayload,
        })

        if (payload.deletedAt || deletedIds.includes(payload.id)) {
          console.log(`[Markers] skipped stale marker id=${payload.id}`)
          return
        }

        const existsIdx = nextPins.findIndex(p => p.id === payload.id)
        if (existsIdx > -1) {
          nextPins[existsIdx] = {
            ...nextPins[existsIdx],
            ...payload,
            status: payload.status,
            note: payload.note,
            userComment: payload.note,
            priority: payload.priority,
            issueType: payload.issueType,
            title: payload.title,
            description: payload.description,
          }
        } else {
          nextPins.push(payload)
        }
      })
      console.log(`[PixelMark Hydration] loaded ${nextPins.length} items`)
      return { pins: nextPins }
    })
  }
}))

// Backward-compatible useCaptureStore definition
type CaptureStore = {
  capturesById: Record<string, CapturePayload>
  captureOrder: string[]
  selectedCaptureId: string | null
  isFeedbackDrawerOpen: boolean
  isCaptureInProgress: boolean

  // Methods
  upsertCapture: (payload: any) => string
  selectCapture: (id: string | null) => void
  openFeedbackDrawer: (id?: string) => void
  closeFeedbackDrawer: () => void
  markCaptureSubmitted: (id: string, response?: any) => void
  markCaptureFailed: (id: string, error: string) => void
  updateCaptureDraft: (id: string, patch: Partial<CapturePayload>) => void
  removeCapture: (id: string) => void
  removeLocalCapture: (id: string) => void
  undoLastLocalCapture: () => void
  clearPageDrafts: (pageUrl: string) => void
  getSelectedCapture: () => CapturePayload | null
  setCaptureInProgress: (inProgress: boolean) => void
  hydratePersistedFeedback: (items: any[]) => void
}

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  capturesById: {},
  captureOrder: [],
  selectedCaptureId: null,
  isFeedbackDrawerOpen: false,
  isCaptureInProgress: false,

  upsertCapture: (raw) => {
    return usePinStore.getState().createPin(raw)
  },
  selectCapture: (id) => {
    usePinStore.getState().openPin(id)
  },
  openFeedbackDrawer: (id) => {
    usePinStore.getState().openPin(id || usePinStore.getState().activePinId)
  },
  closeFeedbackDrawer: () => {
    usePinStore.getState().openPin(null)
  },
  markCaptureSubmitted: (id, response) => {
    usePinStore.getState().updatePin(id, { status: 'submitted', submissionError: null })
  },
  markCaptureFailed: (id, error) => {
    usePinStore.getState().updatePin(id, { status: 'failed', submissionError: error })
  },
  updateCaptureDraft: (id, patch) => {
    usePinStore.getState().updatePin(id, patch)
  },
  removeCapture: (id) => {
    deleteMarker(id)
  },
  removeLocalCapture: (id) => {
    deleteMarker(id)
  },
  undoLastLocalCapture: () => {
    const pins = usePinStore.getState().pins
    const locals = pins.filter(p => p.status !== 'submitted' && p.status !== 'resolved' && !p.persistedId)
    if (!locals.length) return
    const lastId = locals[locals.length - 1].id
    deleteMarker(lastId)
  },
  clearPageDrafts: (pageUrl) => {
    const pins = usePinStore.getState().pins
    const draftsToRemove = pins.filter(p => p.pageUrl === pageUrl && p.status === 'draft').map(p => p.id)
    draftsToRemove.forEach(id => deleteMarker(id))
  },
  getSelectedCapture: () => {
    const activeId = usePinStore.getState().activePinId
    return activeId ? usePinStore.getState().pins.find(p => p.id === activeId) || null : null
  },
  setCaptureInProgress: (inProgress) => {
    useScreenshotStore.getState().setScreenshotState(
      inProgress ? 'capturing' : 'idle',
      useScreenshotStore.getState().screenshotDataUrl,
      useScreenshotStore.getState().screenshotSource,
      useScreenshotStore.getState().screenshotError
    )
  },
  hydratePersistedFeedback: (items) => {
    usePinStore.getState().hydratePersistedFeedback(items)
  }
}))

// Subscribe usePinStore to synchronize useCaptureStore
usePinStore.subscribe((pinState) => {
  const capturesById: Record<string, CapturePayload> = {}
  pinState.pins.forEach(p => {
    capturesById[p.id] = p
  })
  
  useCaptureStore.setState({
    capturesById,
    captureOrder: pinState.pins.map(p => p.id),
    selectedCaptureId: pinState.activePinId,
    isFeedbackDrawerOpen: pinState.activePinId !== null
  })
})

// Subscribe useScreenshotStore to synchronize useCaptureStore screenshot states
useScreenshotStore.subscribe((scrState) => {
  useCaptureStore.setState({
    isCaptureInProgress: scrState.screenshotStatus === 'capturing'
  })
})
