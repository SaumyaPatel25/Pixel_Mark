import { create } from 'zustand'
import { CapturePayload, normalizeCapturePayload, normalizeMarkerCoordinates } from '../utils/normalizeCapturePayload'
import { useScreenshotStore } from './screenshotStore'
import { useMarkerStore } from './markerStore'
import { api } from '@/lib/api'

export type CaptureStatus = 'draft' | 'new' | 'triaged' | 'in_progress' | 'resolved' | 'dismissed' | 'failed' | 'submitted' | 'archived'

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

    // Clean up old tombstone versions — but preserve v3 which is the live source of truth
    localStorage.removeItem('pixelmark_deleted_markers_v2')
    // NOTE: Do NOT remove v3 here — it tracks deletions that must survive page refreshes

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
export const deleteMarker = async (id: string): Promise<void> => {
  console.log(`[Markers] deleting id=${id}`)

  // Check if it was a local draft (no persisted ID or status is draft) BEFORE removing from store
  const pin = usePinStore.getState().pins.find(p => p.id === id)
  const isDraft = !pin || pin.status === 'draft' || !pin.persistedId

  // Save snapshots for rollback
  const prevPins = usePinStore.getState().pins
  const markerStore = useMarkerStore.getState()
  const prevMarkers = markerStore?.markers ?? []
  const prevFiltered = markerStore?.filtered ?? []

  // 1. Optimistically remove from local overlay store state
  usePinStore.getState().removePin(id)

  // 2. Optimistically remove from useMarkerStore if it exists
  try {
    if (markerStore && markerStore.markers) {
      useMarkerStore.setState({
        markers: prevMarkers.filter(m => m.id !== id),
        filtered: prevFiltered.filter(m => m.id !== id)
      })
    }
  } catch (e) {
    // Ignore if markerStore not loaded in this context
  }

  if (!isDraft) {
    // 3. Add to tombstone BEFORE the API call so reconciliation can't restore it
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

    // 4. Call backend — roll back if it fails
    try {
      await api.markers.deleteMarker(id)
      console.log(`[Markers] backend confirmed delete id=${id}`)
    } catch (err) {
      console.error('[Markers] backend delete failed — restoring marker', err)

      // Rollback optimistic removal
      usePinStore.setState({ pins: prevPins })
      try {
        if (markerStore && markerStore.markers) {
          useMarkerStore.setState({ markers: prevMarkers, filtered: prevFiltered })
        }
      } catch (e) { /* ignore */ }

      // Remove from tombstone since delete failed
      if (typeof window !== 'undefined') {
        try {
          const deletedIds = getTombstonedMarkerIds().filter(tid => tid !== id)
          localStorage.setItem('pixelmark_deleted_markers_v3', JSON.stringify(deletedIds))
        } catch (e) { /* ignore */ }
      }

      // Re-throw so the UI caller can show an error
      throw err
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
      
      // Load saved local draft pins first
      if (typeof window !== 'undefined') {
        try {
          const draftsStr = localStorage.getItem('pixelmark_draft_pins_v5')
          if (draftsStr) {
            const drafts = JSON.parse(draftsStr) as CapturePayload[]
            drafts.forEach((draft) => {
              if (!nextPins.some(p => p.id === draft.id) && !deletedIds.includes(draft.id)) {
                nextPins.push(draft)
              }
            })
          }
        } catch (e) {
          console.error('[PixelMark Hydration] failed to load draft pins:', e)
        }
      }

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
  listError: string | null

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
  setListError: (error: string | null) => void
}

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  capturesById: {},
  captureOrder: [],
  selectedCaptureId: null,
  isFeedbackDrawerOpen: false,
  isCaptureInProgress: false,
  listError: null,

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
    const pin = usePinStore.getState().pins.find(p => p.id === id)
    const isAlreadyPersisted = pin && pin.status !== 'draft' && pin.status !== 'failed'
    const nextStatus = isAlreadyPersisted ? pin.status : 'failed'
    usePinStore.getState().updatePin(id, { status: nextStatus, submissionError: error })
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
  },
  setListError: (error) => {
    set({ listError: error })
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

// Autosave draft pins to localStorage
if (typeof window !== 'undefined') {
  usePinStore.subscribe((state) => {
    try {
      const drafts = state.pins.filter(p => p.status === 'draft').map(draft => {
        // Strip out large fields before saving to localStorage to prevent QuotaExceededError
        const light = { ...draft }
        if (light.screenshots) {
          light.screenshots = {
            ...light.screenshots,
            fullPageDataUrl: null,
            cropDataUrl: null,
            targetDataUrl: null,
            canvasSnapshot: null
          }
        }
        light.screenshotdataurl = null
        light.domsnapshot = null
        light.canvasdomsnapshot = null
        if (light.source) {
          light.source = {
            ...light.source,
            outerHtml: null
          }
        }
        return light
      })
      localStorage.setItem('pixelmark_draft_pins_v5', JSON.stringify(drafts))
    } catch (e) {
      console.error('[Markers] failed to autosave draft pins:', e)
    }
  })
}
