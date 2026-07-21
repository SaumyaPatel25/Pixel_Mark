import { create } from 'zustand'
import { DOMEdit, DOMEditCreate, api } from '@/lib/api'

interface DOMEditState {
  edits: DOMEdit[]
  isLoading: boolean
  error: string | null

  fetchEdits: (sessionId: string, shareToken?: string) => Promise<void>
  createEdit: (sessionId: string, data: DOMEditCreate, shareToken?: string) => Promise<DOMEdit>
  deleteEdit: (sessionId: string, editId: string) => Promise<void>
  resetAll: (sessionId: string) => Promise<void>
  exportCSS: (sessionId: string) => Promise<void>
  exportMarkdown: (sessionId: string) => Promise<void>
  exportJSON: (sessionId: string) => Promise<void>
  exportAIImplementation: (sessionId: string) => Promise<void>
  clearError: () => void
}

export const useDOMEditStore = create<DOMEditState>((set, get) => ({
  edits: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchEdits: async (sessionId, shareToken) => {
    set({ isLoading: true, error: null })
    try {
      const grouped = await api.domEdits.list(sessionId, shareToken)
      const edits = Object.values(grouped).flat()
      set({ edits, isLoading: false })
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch DOM edits'
      })
    }
  },

  createEdit: async (sessionId, data, shareToken) => {
    set({ isLoading: true, error: null })
    try {
      const newEdit = await api.domEdits.create(sessionId, data, shareToken)
      set(state => ({
        edits: [...state.edits.filter(e => !(e.selector === newEdit.selector && e.property === newEdit.property)), newEdit],
        isLoading: false
      }))
      return newEdit
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create DOM edit'
      set({ isLoading: false, error: msg })
      throw err
    }
  },

  deleteEdit: async (sessionId, editId) => {
    set({ isLoading: true, error: null })
    const prevEdits = get().edits
    set(state => ({
      edits: state.edits.filter(e => e.id !== editId)
    }))
    try {
      await api.domEdits.delete(sessionId, editId)
      set({ isLoading: false })
    } catch (err: unknown) {
      set({
        edits: prevEdits,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to delete DOM edit'
      })
      throw err
    }
  },

  resetAll: async (sessionId) => {
    set({ isLoading: true, error: null })
    const prevEdits = get().edits
    set({ edits: [] })
    try {
      await api.domEdits.deleteAll(sessionId)
      set({ isLoading: false })
    } catch (err: unknown) {
      set({
        edits: prevEdits,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to reset DOM edits'
      })
      throw err
    }
  },

  exportCSS: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.domEdits.exportCSS(sessionId)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `session_${sessionId}_edits.css`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      set({ isLoading: false })
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to export CSS'
      })
      throw err
    }
  },

  exportMarkdown: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.domEdits.exportMarkdown(sessionId)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `session_${sessionId}_edits.md`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      set({ isLoading: false })
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to export Markdown'
      })
      throw err
    }
  },

  exportJSON: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.domEdits.exportJSON(sessionId)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `session_${sessionId}_edits.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      set({ isLoading: false })
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to export JSON'
      })
      throw err
    }
  },

  exportAIImplementation: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.domEdits.exportAIImplementation(sessionId)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `AI_IMPLEMENTATION_${sessionId}.md`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      set({ isLoading: false })
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to export AI Implementation guide'
      })
      throw err
    }
  }
}))
