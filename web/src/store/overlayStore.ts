import { create } from 'zustand'
import { CapturePayload, normalizeCapturePayload } from '../utils/normalizeCapturePayload'

type CaptureStore = {
  capturesById: Record<string, CapturePayload>
  captureOrder: string[]
  selectedCaptureId: string | null
  isFeedbackDrawerOpen: boolean
  isCaptureInProgress: boolean

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
    const payload = normalizeCapturePayload(raw)
    const id = payload.id

    set((state) => {
      const exists = !!state.capturesById[id]
      const nextCaptures = { ...state.capturesById }
      const nextOrder = [...state.captureOrder]

      if (exists) {
        // Merge without destroying evidence
        nextCaptures[id] = {
          ...nextCaptures[id],
          ...payload,
          // Preserve existing evidence if payload is sparse
          source: { ...nextCaptures[id].source, ...payload.source },
          target: { ...nextCaptures[id].target, ...payload.target },
          screenshots: {
            ...nextCaptures[id].screenshots,
            ...payload.screenshots,
          }
        }
      } else {
        nextCaptures[id] = payload
        nextOrder.push(id)
      }

      console.log(`[PixelMark Store] upserted capture ${id}`)
      return { capturesById: nextCaptures, captureOrder: nextOrder }
    })

    return id
  },

  selectCapture: (id) => {
    set({ selectedCaptureId: id })
  },

  openFeedbackDrawer: (id) => {
    if (id) {
      get().selectCapture(id)
    }
    const currentId = id || get().selectedCaptureId
    console.log(`[PixelMark Drawer] opened capture ${currentId}`)
    set({ isFeedbackDrawerOpen: true })
  },

  closeFeedbackDrawer: () => {
    console.log(`[PixelMark Drawer] closed`)
    set({ isFeedbackDrawerOpen: false })
  },

  markCaptureSubmitted: (id, response) => {
    console.log(`[PixelMark Submit] persisted capture ${id}`)
    set((state) => {
      const capture = state.capturesById[id]
      if (!capture) return state
      return {
        capturesById: {
          ...state.capturesById,
          [id]: { ...capture, status: 'submitted', submissionError: null }
        }
      }
    })
  },

  markCaptureFailed: (id, error) => {
    console.log(`[PixelMark Submit] failed capture ${id}`)
    set((state) => {
      const capture = state.capturesById[id]
      if (!capture) return state
      return {
        capturesById: {
          ...state.capturesById,
          [id]: { ...capture, status: 'failed', submissionError: error }
        }
      }
    })
  },

  updateCaptureDraft: (id, patch) => {
    set((state) => {
      const capture = state.capturesById[id]
      if (!capture) return state
      return {
        capturesById: {
          ...state.capturesById,
          [id]: { ...capture, ...patch }
        }
      }
    })
  },

  removeCapture: (id) => {
    set((state) => {
      const nextCaptures = { ...state.capturesById }
      delete nextCaptures[id]
      return {
        capturesById: nextCaptures,
        captureOrder: state.captureOrder.filter(c => c !== id)
      }
    })
  },

  removeLocalCapture: (id) => {
    set((state) => {
      const capture = state.capturesById[id]
      // Only remove if it exists and is not persisted (status !== 'submitted'/'resolved' and no persistedId)
      if (!capture || capture.status === 'submitted' || capture.status === 'resolved' || capture.persistedId) {
        return state
      }

      console.log(`[PixelMark Pin] removed local ${id}`)

      const nextCaptures = { ...state.capturesById }
      delete nextCaptures[id]

      const nextOrder = state.captureOrder.filter(c => c !== id)

      // Reset selection and drawer state if the removed item was active
      const selectedId = state.selectedCaptureId === id ? null : state.selectedCaptureId
      const isDrawerOpen = state.selectedCaptureId === id ? false : state.isFeedbackDrawerOpen

      return {
        capturesById: nextCaptures,
        captureOrder: nextOrder,
        selectedCaptureId: selectedId,
        isFeedbackDrawerOpen: isDrawerOpen
      }
    })
  },

  undoLastLocalCapture: () => {
    set((state) => {
      // Find all local captures (not submitted, not resolved, no persistedId)
      const locals = state.captureOrder.filter(id => {
        const c = state.capturesById[id]
        return c && c.status !== 'submitted' && c.status !== 'resolved' && !c.persistedId
      })

      if (!locals.length) return state

      const lastId = locals[locals.length - 1]
      console.log(`[PixelMark Pin] undo last local capture ${lastId}`)

      const nextCaptures = { ...state.capturesById }
      delete nextCaptures[lastId]

      const nextOrder = state.captureOrder.filter(c => c !== lastId)

      // Reset selection and drawer state if the removed item was active
      const selectedId = state.selectedCaptureId === lastId ? null : state.selectedCaptureId
      const isDrawerOpen = state.selectedCaptureId === lastId ? false : state.isFeedbackDrawerOpen

      return {
        capturesById: nextCaptures,
        captureOrder: nextOrder,
        selectedCaptureId: selectedId,
        isFeedbackDrawerOpen: isDrawerOpen
      }
    })
  },

  clearPageDrafts: (pageUrl) => {
    set((state) => {
      const draftsToRemove = Object.values(state.capturesById)
        .filter(c => c.pageUrl === pageUrl && c.status === 'draft')
        .map(c => c.id)
      
      if (draftsToRemove.length === 0) return state
 
      const nextCaptures = { ...state.capturesById }
      draftsToRemove.forEach(id => delete nextCaptures[id])

      return {
        capturesById: nextCaptures,
        captureOrder: state.captureOrder.filter(c => !draftsToRemove.includes(c))
      }
    })
  },

  getSelectedCapture: () => {
    const { selectedCaptureId, capturesById } = get()
    return selectedCaptureId ? capturesById[selectedCaptureId] || null : null
  },

  setCaptureInProgress: (inProgress) => {
    set({ isCaptureInProgress: inProgress })
  },

  hydratePersistedFeedback: (items) => {
    set((state) => {
      const nextCaptures = { ...state.capturesById }
      const nextOrder = [...state.captureOrder]
      
      items.forEach((item) => {
        const payload = normalizeCapturePayload({
          id: item.id,
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
          ...item.capturepayload,
        })
        
        const id = payload.id

        if (nextCaptures[id]) {
          nextCaptures[id] = {
            ...nextCaptures[id],
            ...payload,
            status: payload.status,
            userComment: payload.userComment,
            priority: payload.priority,
            issueType: payload.issueType,
          }
        } else {
          nextCaptures[id] = payload
          nextOrder.push(id)
        }
      })

      const selectedId = state.selectedCaptureId
      const hasSelected = selectedId ? !!nextCaptures[selectedId] : false
      const nextSelectedId = hasSelected ? selectedId : null

      console.log(`[PixelMark Hydration] merged ${items.length} items`)

      return {
        capturesById: nextCaptures,
        captureOrder: nextOrder,
        selectedCaptureId: nextSelectedId,
      }
    })
  }
}))
