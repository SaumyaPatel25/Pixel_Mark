import { create } from 'zustand'

export interface UndoRedoAction {
  id: string
  selector: string
  property: string
  oldValue: string
  newValue: string
  pageUrl: string
  elementTag: string
  timestamp: number
}

interface UndoRedoState {
  past: UndoRedoAction[]
  future: UndoRedoAction[]

  pushAction: (action: Omit<UndoRedoAction, 'id' | 'timestamp'>) => void
  undo: () => UndoRedoAction | null
  redo: () => UndoRedoAction | null
  canUndo: boolean
  canRedo: boolean
  clearHistory: () => void
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushAction: (actionData) => {
    const newAction: UndoRedoAction = {
      ...actionData,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    }

    set((state) => {
      // Memory Safety: Capped at 50 entries max, FIFO eviction beyond that
      const newPast = [...state.past, newAction]
      if (newPast.length > 50) {
        newPast.shift()
      }
      return {
        past: newPast,
        future: [], // Clear future on new forward action
        canUndo: newPast.length > 0,
        canRedo: false
      }
    })
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null

    const action = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)
    const newFuture = [action, ...future]

    set({
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true
    })

    return action
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const action = future[0]
    const newFuture = future.slice(1)
    const newPast = [...past, action]

    if (newPast.length > 50) {
      newPast.shift()
    }

    set({
      past: newPast,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0
    })

    return action
  },

  clearHistory: () => set({ past: [], future: [], canUndo: false, canRedo: false })
}))
