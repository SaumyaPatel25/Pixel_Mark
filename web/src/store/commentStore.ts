// src/store/commentStore.ts
import { create } from 'zustand'
import { api, Comment, CommentCreate } from '@/lib/api'
import { posthog } from '@/lib/posthog'

interface CommentState {
  comments:     Comment[]
  loading:      boolean
  error:        string | null
  // Actions
  loadComments:   (projectId: string) => Promise<void>
  addComment:     (data: CommentCreate) => Promise<Comment>
  resolveComment: (id: string) => Promise<void>
  deleteComment:  (id: string) => Promise<void>
  retryComment:   (id: string) => Promise<void>
  // Called by WebSocket
  addCommentFromWS:  (c: Comment) => void
  updateSeverity:    (id: string, severity: string) => void
  updateStatus:      (id: string, status: 'open' | 'resolved') => void
  updateTriage:      (id: string, triage: Partial<Comment>) => void
  clearError:        () => void
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading:  false,
  error:    null,

  clearError: () => set({ error: null }),

  loadComments: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const comments = await api.comments.list(projectId)
      set({ comments, loading: false })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load comments'
      set({ loading: false, error: msg })
    }
  },

  addComment: async (data) => {
    // Optimistic update — add pending comment immediately
    const optimisticId = `pending-${Date.now()}`
    const optimistic: Comment = {
      id:                 optimisticId,
      project_id:         data.project_id,
      text:               data.text,
      component_selector: data.component_selector ?? '',
      xpath:              data.xpath ?? '',
      tag_name:           data.tag_name ?? '',
      inner_text:         data.inner_text ?? '',
      page_url:           data.page_url ?? '/',
      tester_name:        data.tester_name ?? 'Anonymous',
      severity:           null,
      status:             'open',
      x:                  data.x ?? 0,
      y:                  data.y ?? 0,
      marker_number:      data.marker_number ?? 0,
      screenshot_url:     data.screenshot_url ?? null,
      created_at:         new Date().toISOString(),
    }

    set(s => ({ comments: [...s.comments, optimistic] }))

    try {
      const saved = await api.comments.create(data)
      // Replace optimistic with real DB record
      set(s => ({
        comments: s.comments.map(c => c.id === optimisticId ? saved : c),
        error: null,
      }))
      // Track marker creation
      if (typeof window !== 'undefined') {
        posthog.capture('marker_created', {
          marker_id:   saved.id,
          project_id:  saved.project_id,
          page_url:    saved.page_url,
          severity:    saved.severity,
        })
      }
      return saved
    } catch (err: unknown) {
      // Remove optimistic on failure
      set(s => ({
        comments: s.comments.filter(c => c.id !== optimisticId),
        error:    err instanceof Error ? err.message : 'Could not save comment',
      }))
      throw err   // Re-throw so CommandCenter can show retry UI
    }
  },

  resolveComment: async (id) => {
    // Optimistic
    set(s => ({
      comments: s.comments.map(c =>
        c.id === id ? { ...c, status: 'resolved' as const } : c
      )
    }))
    try {
      await api.comments.resolve(id)
      // Track resolution
      if (typeof window !== 'undefined') {
        posthog.capture('marker_resolved', { marker_id: id })
      }
    } catch (err: unknown) {
      // Rollback
      set(s => ({
        comments: s.comments.map(c =>
          c.id === id ? { ...c, status: 'open' as const } : c
        ),
        error: err instanceof Error ? err.message : 'Could not resolve comment',
      }))
    }
  },

  deleteComment: async (id) => {
    const prev = get().comments
    set(s => ({ comments: s.comments.filter(c => c.id !== id) }))
    try {
      await api.comments.delete(id)
      // Track deletion
      if (typeof window !== 'undefined') {
        posthog.capture('marker_deleted', { marker_id: id })
      }
    } catch {
      set({ comments: prev, error: 'Could not delete comment' })
    }
  },

  retryComment: async (id) => {
    const comment = get().comments.find(c => c.id === id)
    if (!comment) return

    // Set status back to 'open' (or some 'retrying' state)
    set(s => ({
      comments: s.comments.map(c => c.id === id ? { ...c, status: 'open' } : c)
    }))

    try {
      const { id: _, created_at: __, status: ___, ...data } = comment as any
      const saved = await api.comments.create(data)
      set(s => ({
        comments: s.comments.map(c => c.id === id ? saved : c),
        error: null,
      }))
    } catch (err: unknown) {
      set(s => ({
        comments: s.comments.map(c => c.id === id ? { ...c, status: 'failed' } : c),
        error: err instanceof Error ? err.message : 'Retry failed',
      }))
    }
  },

  // ── WebSocket handlers ───────────────────────────────────────────────────
  addCommentFromWS: (c) => {
    set(s => {
      // Prevent duplicate if we already have it (e.g. from our own submission)
      if (s.comments.some(x => x.id === c.id)) return s
      return { comments: [...s.comments, c] }
    })
  },

  updateSeverity: (id, severity) => {
    set(s => ({
      comments: s.comments.map(c =>
        c.id === id ? { ...c, severity: severity as Comment['severity'] } : c
      )
    }))
  },

  updateTriage: (id, triage) => {
    set(s => ({
      comments: s.comments.map(c =>
        c.id === id ? { ...c, ...triage } : c
      )
    }))
  },

  updateStatus: (id, status) => {
    set(s => ({
      comments: s.comments.map(c =>
        c.id === id ? { ...c, status } : c
      )
    }))
  },
}))
