import { create } from 'zustand'
import { CanvasFrame } from './canvasStore'
import { useDOMEditStore } from './domEditStore'
import { api } from '@/lib/api'

export type BlueprintToolMode = 'select' | 'connect' | 'dom-edit'
export type FrameEditStatus = 'none' | 'draft' | 'saved'

export interface BlueprintDomTarget {
  frameId: string
  pageUrl: string | null
  selectorPrimary: string | null
  selectorFallback: string | null
  xpath: string | null
  elementTag: string | null
  elementLabel: string | null
  textExcerpt: string | null
}

export type BlueprintEditableValue = string | number | null

export interface BlueprintDraftStyles {
  layout: {
    width?: BlueprintEditableValue
    height?: BlueprintEditableValue
    display?: BlueprintEditableValue
    position?: BlueprintEditableValue
  }
  typography: {
    color?: BlueprintEditableValue
    fontSize?: BlueprintEditableValue
    fontWeight?: BlueprintEditableValue
    lineHeight?: BlueprintEditableValue
    letterSpacing?: BlueprintEditableValue
    textAlign?: BlueprintEditableValue
  }
  spacing: {
    marginTop?: BlueprintEditableValue
    marginRight?: BlueprintEditableValue
    marginBottom?: BlueprintEditableValue
    marginLeft?: BlueprintEditableValue
    paddingTop?: BlueprintEditableValue
    paddingRight?: BlueprintEditableValue
    paddingBottom?: BlueprintEditableValue
    paddingLeft?: BlueprintEditableValue
  }
  background: {
    backgroundColor?: BlueprintEditableValue
    backgroundImage?: BlueprintEditableValue
  }
  border: {
    borderRadius?: BlueprintEditableValue
    borderWidth?: BlueprintEditableValue
    borderColor?: BlueprintEditableValue
    borderStyle?: BlueprintEditableValue
  }
  effects: {
    opacity?: BlueprintEditableValue
    boxShadow?: BlueprintEditableValue
  }
}

export function createEmptyDraftStyles(): BlueprintDraftStyles {
  return {
    layout: {},
    typography: {},
    spacing: {},
    background: {},
    border: {},
    effects: {}
  }
}

export function flattenDraftToOperations(draft: BlueprintDraftStyles) {
  const ops: Array<{
    op_type: 'style'
    property_key: string
    new_value: string | null
    sort_order: number
  }> = []

  const push = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === '' || value === null) return
    ops.push({
      op_type: 'style',
      property_key: key,
      new_value: String(value),
      sort_order: ops.length
    })
  }

  push('width', draft.layout?.width)
  push('height', draft.layout?.height)
  push('display', draft.layout?.display)
  push('position', draft.layout?.position)

  push('color', draft.typography?.color)
  push('font-size', draft.typography?.fontSize)
  push('font-weight', draft.typography?.fontWeight)
  push('line-height', draft.typography?.lineHeight)
  push('letter-spacing', draft.typography?.letterSpacing)
  push('text-align', draft.typography?.textAlign)

  push('margin-top', draft.spacing?.marginTop)
  push('margin-right', draft.spacing?.marginRight)
  push('margin-bottom', draft.spacing?.marginBottom)
  push('margin-left', draft.spacing?.marginLeft)
  push('padding-top', draft.spacing?.paddingTop)
  push('padding-right', draft.spacing?.paddingRight)
  push('padding-bottom', draft.spacing?.paddingBottom)
  push('padding-left', draft.spacing?.paddingLeft)

  push('background-color', draft.background?.backgroundColor)
  push('background-image', draft.background?.backgroundImage)

  push('border-radius', draft.border?.borderRadius)
  push('border-width', draft.border?.borderWidth)
  push('border-color', draft.border?.borderColor)
  push('border-style', draft.border?.borderStyle)

  push('opacity', draft.effects?.opacity)
  push('box-shadow', draft.effects?.boxShadow)

  return ops
}

export interface BlueprintState {
  activeBlueprintTool: BlueprintToolMode
  selectedFrameId: string | null
  selectedFrame: CanvasFrame | null
  inspectorOpen: boolean
  domEditInspectorOpen: boolean
  targetSelector: string
  draftStyles: Record<string, string>
  savedStyles: Record<string, string>
  hasUnsavedChanges: boolean
  isPreviewing: boolean
  linkedSessionStatus: 'connected' | 'disconnected' | 'none'
  frameEditStatusById: Record<string, FrameEditStatus>
  activeSection: string

  // Loading & Saving UX States
  isDomEditLoading: boolean
  isDomEditSaving: boolean

  // Frame-scoped Target & Draft Models
  domTargetByFrameId: Record<string, BlueprintDomTarget>
  draftStylesByFrameId: Record<string, BlueprintDraftStyles>
  savedStylesByFrameId: Record<string, BlueprintDraftStyles>

  // Actions
  setActiveBlueprintTool: (tool: BlueprintToolMode) => void
  selectFrame: (frame: CanvasFrame | null) => void
  setTargetSelector: (selector: string) => void
  updateDraftStyle: (property: string, value: string) => void
  saveEdits: () => Promise<void>
  resetDraft: () => void
  setInspectorOpen: (open: boolean) => void
  setPreviewing: (previewing: boolean) => void
  setActiveSection: (section: string) => void
  getFrameEditStatus: (frameId: string) => FrameEditStatus

  // Frame-scoped & Backend API Integration Actions
  setSelectedDomTarget: (frameId: string, target: BlueprintDomTarget | null) => void
  updateDraftStyleSectionKey: (
    frameId: string,
    section: keyof BlueprintDraftStyles,
    key: string,
    value: BlueprintEditableValue
  ) => void
  resetDraftStyles: (frameId: string) => void
  markFrameEditStatus: (frameId: string, status: FrameEditStatus) => void
  clearDomTarget: (frameId: string) => void

  // Backend API Persistence Methods
  loadFrameDomEditContext: (projectId: string, frameId: string) => Promise<void>
  saveFrameDomTarget: (projectId: string, frameId: string) => Promise<void>
  saveDraftAsEditSet: (projectId: string, frameId: string) => Promise<void>
  hydrateDraftFromLatestSaved: (frameId: string) => void
  exportBlueprintFrameCSS: (projectId: string, frameId: string) => Promise<string>

  // Live Session Embed Actions
  connectSessionToFrame: (frameId: string, sessionId: string) => Promise<void>
  disconnectSessionFromFrame: (frameId: string) => Promise<void>
  setBlueprintDomTargetFromClick: (frameId: string, targetPayload: Partial<BlueprintDomTarget>) => void
}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  activeBlueprintTool: 'select',
  selectedFrameId: null,
  selectedFrame: null,
  inspectorOpen: false,
  domEditInspectorOpen: false,
  targetSelector: 'body',
  draftStyles: {},
  savedStyles: {},
  hasUnsavedChanges: false,
  isPreviewing: false,
  linkedSessionStatus: 'none',
  frameEditStatusById: {},
  activeSection: 'overview',

  isDomEditLoading: false,
  isDomEditSaving: false,

  domTargetByFrameId: {},
  draftStylesByFrameId: {},
  savedStylesByFrameId: {},

  setActiveBlueprintTool: (tool) => {
    set({
      activeBlueprintTool: tool,
      domEditInspectorOpen: tool === 'dom-edit' && !!get().selectedFrame
    })
  },

  selectFrame: (frame) => {
    const { activeBlueprintTool } = get()
    if (!frame) {
      set({
        selectedFrameId: null,
        selectedFrame: null,
        inspectorOpen: false,
        domEditInspectorOpen: false,
        draftStyles: {},
        savedStyles: {},
        hasUnsavedChanges: false,
        linkedSessionStatus: 'none'
      })
      return
    }

    set({
      selectedFrameId: frame.id,
      selectedFrame: frame,
      inspectorOpen: true,
      domEditInspectorOpen: activeBlueprintTool === 'dom-edit',
      draftStyles: {},
      savedStyles: {},
      hasUnsavedChanges: false,
      linkedSessionStatus: frame.session_id ? 'connected' : 'none'
    })

    // Load project-scoped Blueprint context
    if (frame.project_id && frame.id) {
      get().loadFrameDomEditContext(frame.project_id, frame.id)
    }
  },

  setTargetSelector: (selector) => {
    set({ targetSelector: selector || 'body' })
  },

  updateDraftStyle: (property, value) => {
    const { draftStyles, selectedFrameId, frameEditStatusById } = get()
    const updated = { ...draftStyles, [property]: value }
    const updatedStatusById = selectedFrameId
      ? { ...frameEditStatusById, [selectedFrameId]: 'draft' as FrameEditStatus }
      : frameEditStatusById

    set({
      draftStyles: updated,
      hasUnsavedChanges: true,
      frameEditStatusById: updatedStatusById
    })
  },

  saveEdits: async () => {
    const { selectedFrame } = get()
    if (selectedFrame && selectedFrame.project_id && selectedFrame.id) {
      await get().saveDraftAsEditSet(selectedFrame.project_id, selectedFrame.id)
    }
  },

  resetDraft: () => {
    const { selectedFrameId } = get()
    if (selectedFrameId) {
      get().hydrateDraftFromLatestSaved(selectedFrameId)
    }
  },

  setInspectorOpen: (open) => {
    set({ inspectorOpen: open, domEditInspectorOpen: open })
  },

  setPreviewing: (previewing) => {
    set({ isPreviewing: previewing })
  },

  setActiveSection: (section) => {
    set({ activeSection: section })
  },

  getFrameEditStatus: (frameId) => {
    return get().frameEditStatusById[frameId] || 'none'
  },

  // ── Frame-scoped Target & Draft Actions ─────────────────────────────────────
  setSelectedDomTarget: (frameId, target) => {
    set((state) => {
      if (!target) {
        const nextTargets = { ...state.domTargetByFrameId }
        delete nextTargets[frameId]
        return { domTargetByFrameId: nextTargets }
      }
      return {
        domTargetByFrameId: {
          ...state.domTargetByFrameId,
          [frameId]: target
        }
      }
    })
  },

  updateDraftStyleSectionKey: (frameId, section, key, value) => {
    set((state) => {
      const current = state.draftStylesByFrameId[frameId] ?? createEmptyDraftStyles()
      const updatedSection = {
        ...current[section],
        [key]: value
      }
      const updatedFrameStyles = {
        ...current,
        [section]: updatedSection
      }
      return {
        draftStylesByFrameId: {
          ...state.draftStylesByFrameId,
          [frameId]: updatedFrameStyles
        },
        frameEditStatusById: {
          ...state.frameEditStatusById,
          [frameId]: 'draft'
        },
        hasUnsavedChanges: true
      }
    })
  },

  resetDraftStyles: (frameId) => {
    set((state) => {
      const saved = state.savedStylesByFrameId[frameId]
      if (saved) {
        return {
          draftStylesByFrameId: {
            ...state.draftStylesByFrameId,
            [frameId]: JSON.parse(JSON.stringify(saved))
          },
          frameEditStatusById: {
            ...state.frameEditStatusById,
            [frameId]: 'saved'
          },
          hasUnsavedChanges: false
        }
      }

      const nextDrafts = { ...state.draftStylesByFrameId }
      delete nextDrafts[frameId]
      return {
        draftStylesByFrameId: nextDrafts,
        frameEditStatusById: {
          ...state.frameEditStatusById,
          [frameId]: 'none'
        },
        hasUnsavedChanges: false
      }
    })
  },

  markFrameEditStatus: (frameId, status) => {
    set((state) => ({
      frameEditStatusById: {
        ...state.frameEditStatusById,
        [frameId]: status
      }
    }))
  },

  clearDomTarget: (frameId) => {
    set((state) => {
      const nextTargets = { ...state.domTargetByFrameId }
      delete nextTargets[frameId]
      return { domTargetByFrameId: nextTargets }
    })
  },

  // ── Project-scoped Backend Persistence Methods ─────────────────────────────
  loadFrameDomEditContext: async (projectId, frameId) => {
    set({ isDomEditLoading: true })
    try {
      // 1. Fetch Target
      const targetRes = await api.blueprintDomEdits.getBlueprintDomTarget(projectId, frameId)
      if (targetRes) {
        const domTarget: BlueprintDomTarget = {
          frameId,
          pageUrl: targetRes.page_url,
          selectorPrimary: targetRes.selector_primary,
          selectorFallback: targetRes.selector_fallback,
          xpath: targetRes.xpath,
          elementTag: targetRes.element_tag,
          elementLabel: targetRes.element_label,
          textExcerpt: targetRes.text_excerpt
        }
        set((state) => ({
          domTargetByFrameId: {
            ...state.domTargetByFrameId,
            [frameId]: domTarget
          },
          targetSelector: targetRes.selector_primary || 'body'
        }))
      }

      // 2. Fetch Edit Sets
      const editSets = await api.blueprintDomEdits.listBlueprintEditSets(projectId, frameId)
      if (editSets && editSets.length > 0) {
        const latestSet = editSets[0]
        const loadedSavedStyles = createEmptyDraftStyles()

        if (latestSet.operations) {
          latestSet.operations.forEach((op: any) => {
            if (op.op_type === 'style' && op.property_key && op.new_value) {
              const pKey = op.property_key
              const val = op.new_value

              if (pKey === 'width') loadedSavedStyles.layout.width = val
              else if (pKey === 'height') loadedSavedStyles.layout.height = val
              else if (pKey === 'display') loadedSavedStyles.layout.display = val
              else if (pKey === 'position') loadedSavedStyles.layout.position = val
              else if (pKey === 'color') loadedSavedStyles.typography.color = val
              else if (pKey === 'font-size') loadedSavedStyles.typography.fontSize = val
              else if (pKey === 'font-weight') loadedSavedStyles.typography.fontWeight = val
              else if (pKey === 'background-color') loadedSavedStyles.background.backgroundColor = val
              else if (pKey === 'border-radius') loadedSavedStyles.border.borderRadius = val
              else if (pKey === 'opacity') loadedSavedStyles.effects.opacity = val
              else if (pKey === 'box-shadow') loadedSavedStyles.effects.boxShadow = val
            }
          })
        }

        set((state) => ({
          savedStylesByFrameId: {
            ...state.savedStylesByFrameId,
            [frameId]: loadedSavedStyles
          },
          draftStylesByFrameId: {
            ...state.draftStylesByFrameId,
            [frameId]: JSON.parse(JSON.stringify(loadedSavedStyles))
          },
          frameEditStatusById: {
            ...state.frameEditStatusById,
            [frameId]: 'saved'
          },
          hasUnsavedChanges: false
        }))
      }
    } catch (err) {
      console.error('[BlueprintStore] Failed to load frame DOM edit context:', err)
    } finally {
      set({ isDomEditLoading: false })
    }
  },

  saveFrameDomTarget: async (projectId, frameId) => {
    const target = get().domTargetByFrameId[frameId]
    if (!target) return

    try {
      await api.blueprintDomEdits.upsertBlueprintDomTarget(projectId, frameId, {
        page_url: target.pageUrl,
        selector_primary: target.selectorPrimary,
        selector_fallback: target.selectorFallback,
        xpath: target.xpath,
        element_tag: target.elementTag,
        element_label: target.elementLabel,
        text_excerpt: target.textExcerpt
      })
    } catch (err) {
      console.error('[BlueprintStore] Failed to save frame DOM target:', err)
    }
  },

  saveDraftAsEditSet: async (projectId, frameId) => {
    set({ isDomEditSaving: true })
    try {
      // 1. Ensure target is saved
      await get().saveFrameDomTarget(projectId, frameId)
      const target = get().domTargetByFrameId[frameId]

      // 2. Create Edit Set
      const newSet = await api.blueprintDomEdits.createBlueprintEditSet(projectId, frameId, {
        name: `Design Edit Set ${new Date().toLocaleTimeString()}`,
        status: 'saved',
        target_id: target ? target.frameId : null
      })

      // 3. Flatten operations
      const draft = get().draftStylesByFrameId[frameId] || createEmptyDraftStyles()
      const ops = flattenDraftToOperations(draft)

      for (const op of ops) {
        await api.blueprintDomEdits.createBlueprintEditOperation(projectId, newSet.id, op)
      }

      set((state) => ({
        savedStylesByFrameId: {
          ...state.savedStylesByFrameId,
          [frameId]: JSON.parse(JSON.stringify(draft))
        },
        frameEditStatusById: {
          ...state.frameEditStatusById,
          [frameId]: 'saved'
        },
        hasUnsavedChanges: false
      }))
    } catch (err) {
      console.error('[BlueprintStore] Failed to save draft as edit set:', err)
      throw err
    } finally {
      set({ isDomEditSaving: false })
    }
  },

  hydrateDraftFromLatestSaved: (frameId) => {
    const saved = get().savedStylesByFrameId[frameId]
    if (saved) {
      set((state) => ({
        draftStylesByFrameId: {
          ...state.draftStylesByFrameId,
          [frameId]: JSON.parse(JSON.stringify(saved))
        },
        frameEditStatusById: {
          ...state.frameEditStatusById,
          [frameId]: 'saved'
        },
        hasUnsavedChanges: false
      }))
    } else {
      set((state) => {
        const nextDrafts = { ...state.draftStylesByFrameId }
        delete nextDrafts[frameId]
        return {
          draftStylesByFrameId: nextDrafts,
          frameEditStatusById: {
            ...state.frameEditStatusById,
            [frameId]: 'none'
          },
          hasUnsavedChanges: false
        }
      })
    }
  },

  exportBlueprintFrameCSS: async (projectId, frameId) => {
    return api.blueprintDomEdits.exportBlueprintFrameCSS(projectId, frameId)
  },

  connectSessionToFrame: async (frameId, sessionId) => {
    try {
      await api.canvas.updateFrame(frameId, { session_id: sessionId })
      const { useCanvasStore } = await import('./canvasStore')
      useCanvasStore.setState((state) => ({
        frames: state.frames.map((f) => (f.id === frameId ? { ...f, session_id: sessionId } : f))
      }))
      const currentSelected = get().selectedFrame
      if (currentSelected && currentSelected.id === frameId) {
        set({
          selectedFrame: { ...currentSelected, session_id: sessionId },
          linkedSessionStatus: 'connected'
        })
      }
    } catch (err) {
      console.error('[BlueprintStore] Failed to connect session to frame:', err)
      throw err
    }
  },

  disconnectSessionFromFrame: async (frameId) => {
    try {
      await api.canvas.updateFrame(frameId, { session_id: null })
      const { useCanvasStore } = await import('./canvasStore')
      useCanvasStore.setState((state) => ({
        frames: state.frames.map((f) => (f.id === frameId ? { ...f, session_id: undefined } : f))
      }))
      const currentSelected = get().selectedFrame
      if (currentSelected && currentSelected.id === frameId) {
        set({
          selectedFrame: { ...currentSelected, session_id: undefined },
          linkedSessionStatus: 'none'
        })
      }
    } catch (err) {
      console.error('[BlueprintStore] Failed to disconnect session from frame:', err)
      throw err
    }
  },

  setBlueprintDomTargetFromClick: (frameId, targetPayload) => {
    const existing = get().domTargetByFrameId[frameId]
    const target: BlueprintDomTarget = {
      frameId,
      pageUrl: targetPayload.pageUrl ?? existing?.pageUrl ?? null,
      selectorPrimary: targetPayload.selectorPrimary ?? existing?.selectorPrimary ?? null,
      selectorFallback: targetPayload.selectorFallback ?? existing?.selectorFallback ?? null,
      xpath: targetPayload.xpath ?? existing?.xpath ?? null,
      elementTag: targetPayload.elementTag ?? existing?.elementTag ?? 'div',
      elementLabel: targetPayload.elementLabel ?? targetPayload.selectorPrimary ?? 'Selected Element',
      textExcerpt: targetPayload.textExcerpt ?? existing?.textExcerpt ?? null
    }

    set((state) => ({
      domTargetByFrameId: {
        ...state.domTargetByFrameId,
        [frameId]: target
      },
      targetSelector: targetPayload.selectorPrimary || 'body',
      hasUnsavedChanges: true
    }))
  }
}))
