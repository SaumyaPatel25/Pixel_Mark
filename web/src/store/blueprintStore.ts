import { create } from 'zustand'
import { api } from '@/lib/api'

export type BlueprintTool = 
  | 'select' 
  | 'move' 
  | 'frame' 
  | 'section' 
  | 'text' 
  | 'shape' 
  | 'dom-edit' 
  | 'comment'

export type InsertionMode = 'replace' | 'before' | 'after' | 'inside'

export type BlueprintTargetKind = 'text' | 'image' | 'button' | 'container' | 'input' | 'generic'

export interface BlueprintDOMTarget {
  selector: string
  xpath?: string
  tag: string
  textExcerpt?: string
  boundingRect?: {
    top: number
    left: number
    width: number
    height: number
  }
  rect?: { x: number; y: number; width: number; height: number }
  pageUrl?: string
  frameId?: string
  targetKind: BlueprintTargetKind
  canInsertInside?: boolean
  canReplace?: boolean
}

export function inferTargetKind(tag: string, selector: string = ''): BlueprintTargetKind {
  const t = (tag || '').toLowerCase()
  const sel = (selector || '').toLowerCase()

  if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'b', 'i', 'strong', 'em'].includes(t)) {
    return 'text'
  }
  if (['img', 'svg', 'picture', 'canvas', 'video'].includes(t)) {
    return 'image'
  }
  if (['button', 'a'].includes(t) || sel.includes('btn') || sel.includes('button')) {
    return 'button'
  }
  if (['input', 'textarea', 'select'].includes(t)) {
    return 'input'
  }
  if (['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'li', 'ul', 'ol', 'form', 'nav', 'table'].includes(t)) {
    return 'container'
  }
  return 'generic'
}

export interface BlueprintMutation {
  id: string
  targetSelector: string
  actionType: InsertionMode
  presetId: string
  presetName: string
  htmlPayload: string
  timestamp: string
}

export interface BlueprintHistorySnapshot {
  pendingMutations: BlueprintMutation[]
  frames: BlueprintFrameNode[]
  selectedTarget: BlueprintDOMTarget | null
  selectedNodeId: string | null
}

export interface BlueprintElementNode {
  id: string
  name: string
  type: 'section' | 'text' | 'shape' | 'dom-target'
  styles: {
    display?: string
    flexDirection?: string
    gap?: string
    padding?: string
    margin?: string
    color?: string
    fontSize?: string
    fontWeight?: string
    backgroundColor?: string
    borderRadius?: string
    border?: string
    boxShadow?: string
    opacity?: string
  }
  children?: BlueprintElementNode[]
}

export interface BlueprintFrameNode {
  id: string
  title: string
  url?: string
  sessionId?: string
  positionX: number
  positionY: number
  width: number
  height: number
  color: string
  elements: BlueprintElementNode[]
}

interface BlueprintState {
  // Tool & selection state
  activeTool: BlueprintTool
  selectedFrameId: string | null
  selectedNodeId: string | null

  // Live Frame & DOM Target state
  liveFrameUrl: string
  sessionId: string | null
  selectedTarget: BlueprintDOMTarget | null
  hoveredTarget: { selector: string; tag: string } | null
  
  // Preset Library & Insertion state
  isLibraryOpen: boolean
  selectedPresetId: string | null
  insertionMode: InsertionMode
  pendingMutations: BlueprintMutation[]

  // History & Traversal
  past: BlueprintHistorySnapshot[]
  future: BlueprintHistorySnapshot[]
  baselineSnapshot: BlueprintHistorySnapshot | null

  // Persistence state
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error'
  lastSavedAt: Date | null

  // Viewport state
  zoom: number
  pan: { x: number; y: number }

  // Panels & modes
  isLayersOpen: boolean
  isInspectorOpen: boolean
  previewMode: boolean
  isDirty: boolean

  // Data
  frames: BlueprintFrameNode[]

  // Actions & History Pipeline
  commitHistory: () => void
  undo: () => void
  redo: () => void
  resetToBase: () => void
  setBaselineSnapshot: (snapshot?: BlueprintHistorySnapshot) => void

  loadPersistedEdits: (projectId: string) => Promise<void>
  saveBlueprintEdits: (projectId: string) => Promise<void>

  setActiveTool: (tool: BlueprintTool) => void
  setSelectedFrameId: (id: string | null) => void
  setSelectedNodeId: (id: string | null) => void
  setLiveFrameUrl: (url: string) => void
  setSessionId: (sessionId: string | null) => void
  setSelectedTarget: (target: BlueprintDOMTarget | null) => void
  setHoveredTarget: (target: { selector: string; tag: string } | null) => void
  
  toggleLibrary: () => void
  setIsLibraryOpen: (open: boolean) => void
  setSelectedPresetId: (id: string | null) => void
  setInsertionMode: (mode: InsertionMode) => void
  
  addMutation: (mutation: Omit<BlueprintMutation, 'id' | 'timestamp'>) => void
  removeMutation: (id: string) => void
  clearMutations: () => void

  setZoom: (zoom: number | ((prev: number) => number)) => void
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void
  resetViewport: () => void
  toggleLayers: () => void
  toggleInspector: () => void
  setPreviewMode: (preview: boolean) => void
  updateFramePosition: (id: string, x: number, y: number) => void
  updateNodeStyles: (frameId: string, nodeId: string, styles: Partial<BlueprintElementNode['styles']>) => void
  addFrame: (title?: string) => void
}

const DEFAULT_HOMEPAGE_FRAME: BlueprintFrameNode = {
  id: 'frame_homepage',
  title: 'Homepage Live Surface',
  url: 'https://example.com',
  positionX: 80,
  positionY: 60,
  width: 1280,
  height: 850,
  color: '#06b6d4',
  elements: [
    {
      id: 'node_hero_section',
      name: 'Hero Container',
      type: 'section',
      styles: {
        backgroundColor: '#0f172a',
        padding: '40px',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid rgba(6,182,212,0.2)'
      },
      children: [
        {
          id: 'node_hero_title',
          name: 'Hero Heading',
          type: 'text',
          styles: {
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: '700'
          }
        },
        {
          id: 'node_cta_button',
          name: 'Primary Action',
          type: 'shape',
          styles: {
            backgroundColor: '#06b6d4',
            color: '#090d16',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: '600'
          }
        }
      ]
    }
  ]
}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  activeTool: 'select',
  selectedFrameId: 'frame_homepage',
  selectedNodeId: null,

  liveFrameUrl: 'https://example.com',
  sessionId: null,
  selectedTarget: null,
  hoveredTarget: null,

  isLibraryOpen: false,
  selectedPresetId: null,
  insertionMode: 'replace',
  pendingMutations: [],

  past: [],
  future: [],
  baselineSnapshot: null,

  saveStatus: 'saved',
  lastSavedAt: null,

  zoom: 1.0,
  pan: { x: 0, y: 0 },

  isLayersOpen: true,
  isInspectorOpen: true,
  previewMode: false,
  isDirty: false,

  frames: [DEFAULT_HOMEPAGE_FRAME],

  // ==========================================
  // PERSISTENCE ENGINE (Project-Scoped Edits)
  // ==========================================
  loadPersistedEdits: async (projectId: string) => {
    try {
      const res = await api.blueprint.getEdits(projectId)
      if (Array.isArray(res)) {
        const mappedMutations: BlueprintMutation[] = res.map((m: any) => ({
          id: m.id,
          targetSelector: m.targetSelector,
          actionType: m.actionType as InsertionMode,
          presetId: m.presetId || 'custom',
          presetName: m.presetName || 'Blueprint Mutation',
          htmlPayload: m.htmlPayload || '',
          timestamp: m.timestamp || new Date().toISOString()
        }))

        set({
          pendingMutations: mappedMutations,
          isDirty: false,
          saveStatus: 'saved'
        })

        get().setBaselineSnapshot()
      }
    } catch (err) {
      console.warn('[BlueprintStore] Error loading persisted edits:', err)
    }
  },

  saveBlueprintEdits: async (projectId: string) => {
    set({ saveStatus: 'saving' })
    try {
      const { pendingMutations } = get()
      const saved = await api.blueprint.saveEdits(projectId, pendingMutations)
      if (Array.isArray(saved)) {
        set({
          saveStatus: 'saved',
          isDirty: false,
          lastSavedAt: new Date()
        })
        get().setBaselineSnapshot()
      }
    } catch (err) {
      console.error('[BlueprintStore] Error saving blueprint edits:', err)
      set({ saveStatus: 'error' })
    }
  },

  // ==========================================
  // HISTORY ENGINE (Undo / Redo / Reset)
  // ==========================================
  commitHistory: () =>
    set((state) => {
      const currentSnapshot: BlueprintHistorySnapshot = {
        pendingMutations: [...state.pendingMutations],
        frames: JSON.parse(JSON.stringify(state.frames)),
        selectedTarget: state.selectedTarget ? { ...state.selectedTarget } : null,
        selectedNodeId: state.selectedNodeId
      }
      const updatedPast = [...state.past, currentSnapshot].slice(-50)
      return {
        past: updatedPast,
        future: []
      }
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state

      const currentSnapshot: BlueprintHistorySnapshot = {
        pendingMutations: [...state.pendingMutations],
        frames: JSON.parse(JSON.stringify(state.frames)),
        selectedTarget: state.selectedTarget ? { ...state.selectedTarget } : null,
        selectedNodeId: state.selectedNodeId
      }

      const newPast = [...state.past]
      const targetSnapshot = newPast.pop()!

      return {
        past: newPast,
        future: [currentSnapshot, ...state.future],
        pendingMutations: targetSnapshot.pendingMutations,
        frames: targetSnapshot.frames,
        selectedTarget: targetSnapshot.selectedTarget,
        selectedNodeId: targetSnapshot.selectedNodeId,
        isDirty: newPast.length > 0
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state

      const currentSnapshot: BlueprintHistorySnapshot = {
        pendingMutations: [...state.pendingMutations],
        frames: JSON.parse(JSON.stringify(state.frames)),
        selectedTarget: state.selectedTarget ? { ...state.selectedTarget } : null,
        selectedNodeId: state.selectedNodeId
      }

      const newFuture = [...state.future]
      const targetSnapshot = newFuture.shift()!

      return {
        past: [...state.past, currentSnapshot],
        future: newFuture,
        pendingMutations: targetSnapshot.pendingMutations,
        frames: targetSnapshot.frames,
        selectedTarget: targetSnapshot.selectedTarget,
        selectedNodeId: targetSnapshot.selectedNodeId,
        isDirty: true
      }
    }),

  resetToBase: () =>
    set((state) => {
      const base = state.baselineSnapshot || {
        pendingMutations: [],
        frames: state.frames.map((f) => ({ ...f, elements: [] })),
        selectedTarget: null,
        selectedNodeId: null
      }
      return {
        past: [],
        future: [],
        pendingMutations: base.pendingMutations,
        frames: base.frames,
        selectedTarget: base.selectedTarget,
        selectedNodeId: base.selectedNodeId,
        isDirty: false
      }
    }),

  setBaselineSnapshot: (customSnapshot) =>
    set((state) => {
      const snap: BlueprintHistorySnapshot = customSnapshot || {
        pendingMutations: [...state.pendingMutations],
        frames: JSON.parse(JSON.stringify(state.frames)),
        selectedTarget: state.selectedTarget,
        selectedNodeId: state.selectedNodeId
      }
      return { baselineSnapshot: snap }
    }),

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      isLibraryOpen: tool === 'dom-edit' ? true : state.isLibraryOpen
    })),

  setSelectedFrameId: (id) => set({ selectedFrameId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setLiveFrameUrl: (url) =>
    set((state) => ({
      liveFrameUrl: url,
      frames: state.frames.map((f) => (f.id === state.selectedFrameId ? { ...f, url } : f))
    })),

  setSessionId: (sessionId) => set({ sessionId }),
  setSelectedTarget: (target) => set({ selectedTarget: target }),
  setHoveredTarget: (target) => set({ hoveredTarget: target }),

  toggleLibrary: () => set((state) => ({ isLibraryOpen: !state.isLibraryOpen })),
  setIsLibraryOpen: (open) => set({ isLibraryOpen: open }),
  setSelectedPresetId: (id) => set({ selectedPresetId: id }),
  setInsertionMode: (mode) => set({ insertionMode: mode }),

  addMutation: (mutationData) => {
    get().commitHistory()
    set((state) => {
      const newMutation: BlueprintMutation = {
        ...mutationData,
        id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString()
      }
      return {
        pendingMutations: [newMutation, ...state.pendingMutations],
        isDirty: true
      }
    })
  },

  removeMutation: (id) => {
    get().commitHistory()
    set((state) => ({
      pendingMutations: state.pendingMutations.filter((m) => m.id !== id),
      isDirty: state.pendingMutations.length > 1
    }))
  },

  clearMutations: () => {
    get().commitHistory()
    set({ pendingMutations: [], isDirty: false })
  },

  setZoom: (zoomOrFn) =>
    set((state) => {
      const newZoom = typeof zoomOrFn === 'function' ? zoomOrFn(state.zoom) : zoomOrFn
      const clamped = Math.max(0.1, Math.min(3.0, Number(newZoom.toFixed(2))))
      return { zoom: clamped }
    }),

  setPan: (panOrFn) =>
    set((state) => ({
      pan: typeof panOrFn === 'function' ? panOrFn(state.pan) : panOrFn
    })),

  resetViewport: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),

  toggleLayers: () => set((state) => ({ isLayersOpen: !state.isLayersOpen })),
  toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),
  setPreviewMode: (preview) => set({ previewMode: preview }),

  updateFramePosition: (id, x, y) => {
    get().commitHistory()
    set((state) => ({
      frames: state.frames.map((f) => (f.id === id ? { ...f, positionX: x, positionY: y } : f)),
      isDirty: true
    }))
  },

  updateNodeStyles: (frameId, nodeId, newStyles) => {
    get().commitHistory()
    set((state) => {
      const updateElements = (elements: BlueprintElementNode[]): BlueprintElementNode[] =>
        elements.map((el) => {
          if (el.id === nodeId) {
            return { ...el, styles: { ...el.styles, ...newStyles } }
          }
          if (el.children && el.children.length > 0) {
            return { ...el, children: updateElements(el.children) }
          }
          return el
        })

      return {
        frames: state.frames.map((f) =>
          f.id === frameId ? { ...f, elements: updateElements(f.elements) } : f
        ),
        isDirty: true
      }
    })
  },

  addFrame: (title = 'New Artboard') =>
    set((state) => {
      const newFrame: BlueprintFrameNode = {
        id: `frame_${Date.now()}`,
        title,
        positionX: (state.frames.length + 1) * 1400,
        positionY: 60,
        width: 1280,
        height: 850,
        color: '#06b6d4',
        elements: []
      }
      return {
        frames: [...state.frames, newFrame],
        selectedFrameId: newFrame.id,
        isDirty: true
      }
    })
}))
