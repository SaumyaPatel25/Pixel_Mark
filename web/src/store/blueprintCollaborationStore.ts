import { create } from 'zustand'
import { api } from '@/lib/api'

export interface BlueprintComment {
  id: string
  project_id: string
  canvas_frame_id?: string | null
  blueprint_edit_id?: string | null
  target_selector?: string | null
  page_url?: string | null
  author_id?: string | null
  author_name?: string | null
  body: string
  status: 'open' | 'resolved'
  parent_comment_id?: string | null
  created_at: string
  updated_at: string
  replies?: BlueprintComment[]
}

export interface BlueprintStatusHistoryItem {
  id: string
  publication_id: string
  previous_status: string
  new_status: string
  changed_by_id?: string | null
  changed_by_name?: string | null
  note?: string | null
  created_at: string
}

export type PublicationStatus = 'draft' | 'in_review' | 'approved' | 'changes_requested'

export interface CommentTargetContext {
  selector?: string
  pageUrl?: string
  frameId?: string
  editId?: string
  textExcerpt?: string
  boundingRect?: { top: number; left: number; width: number; height: number }
}

interface BlueprintCollaborationState {
  comments: BlueprintComment[]
  activeCommentTarget: CommentTargetContext | null
  isComposingComment: boolean
  isThreadPanelOpen: boolean
  publicationStatus: PublicationStatus
  statusHistory: BlueprintStatusHistoryItem[]
  unresolvedCommentCount: number
  activePublicationId: string | null
  isLoadingComments: boolean
  isLoadingStatus: boolean

  // Actions
  loadComments: (projectId: string) => Promise<void>
  addComment: (projectId: string, data: {
    canvas_frame_id?: string
    blueprint_edit_id?: string
    target_selector?: string
    page_url?: string
    author_name?: string
    body: string
    parent_comment_id?: string
  }) => Promise<BlueprintComment>
  updateComment: (projectId: string, commentId: string, data: { body?: string; status?: 'open' | 'resolved' }) => Promise<void>
  deleteComment: (projectId: string, commentId: string) => Promise<void>
  resolveComment: (projectId: string, commentId: string) => Promise<void>

  // Target composition
  startComposingComment: (target: CommentTargetContext) => void
  cancelComposingComment: () => void
  toggleThreadPanel: (open?: boolean) => void

  // Status & Approval workflow
  updatePublicationStatus: (
    projectId: string,
    publicationId: string,
    status: PublicationStatus,
    note?: string,
    userRole?: string,
    userName?: string
  ) => Promise<void>
  loadPublicationHistory: (projectId: string, publicationId: string) => Promise<void>
  setPublicationStatus: (status: PublicationStatus) => void
  setActivePublicationId: (publicationId: string | null) => void
}

function countUnresolved(comments: BlueprintComment[]): number {
  let count = 0
  for (const c of comments) {
    if (c.status === 'open') count++
    if (c.replies && c.replies.length > 0) {
      count += countUnresolved(c.replies)
    }
  }
  return count
}

export const useBlueprintCollaborationStore = create<BlueprintCollaborationState>((set, get) => ({
  comments: [],
  activeCommentTarget: null,
  isComposingComment: false,
  isThreadPanelOpen: false,
  publicationStatus: 'draft',
  statusHistory: [],
  unresolvedCommentCount: 0,
  activePublicationId: null,
  isLoadingComments: false,
  isLoadingStatus: false,

  loadComments: async (projectId: string) => {
    if (!projectId) return
    set({ isLoadingComments: true })
    try {
      const res: any = await api.blueprint.listComments(projectId)
      const commentsList: BlueprintComment[] = Array.isArray(res) ? res : []
      set({
        comments: commentsList,
        unresolvedCommentCount: countUnresolved(commentsList),
        isLoadingComments: false
      })
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to load comments:', err)
      set({ isLoadingComments: false })
    }
  },

  addComment: async (projectId: string, data) => {
    try {
      const created: any = await api.blueprint.createComment(projectId, data)
      await get().loadComments(projectId)
      set({ isComposingComment: false, activeCommentTarget: null, isThreadPanelOpen: true })
      return created
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to post comment:', err)
      throw err
    }
  },

  updateComment: async (projectId: string, commentId: string, data) => {
    try {
      await api.blueprint.updateComment(projectId, commentId, data)
      await get().loadComments(projectId)
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to update comment:', err)
      throw err
    }
  },

  deleteComment: async (projectId: string, commentId: string) => {
    try {
      await api.blueprint.deleteComment(projectId, commentId)
      await get().loadComments(projectId)
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to delete comment:', err)
      throw err
    }
  },

  resolveComment: async (projectId: string, commentId: string) => {
    try {
      await api.blueprint.resolveComment(projectId, commentId)
      await get().loadComments(projectId)
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to resolve comment:', err)
      throw err
    }
  },

  startComposingComment: (target) => {
    set({
      activeCommentTarget: target,
      isComposingComment: true,
      isThreadPanelOpen: true
    })
  },

  cancelComposingComment: () => {
    set({
      activeCommentTarget: null,
      isComposingComment: false
    })
  },

  toggleThreadPanel: (open) => {
    set(state => ({
      isThreadPanelOpen: typeof open === 'boolean' ? open : !state.isThreadPanelOpen
    }))
  },

  updatePublicationStatus: async (projectId, publicationId, status, note, userRole, userName) => {
    try {
      const updated: any = await api.blueprint.updatePublicationStatus(
        projectId,
        publicationId,
        status,
        note,
        userName || 'STAGE User',
        userRole || 'developer'
      )
      set({ publicationStatus: updated.status || status })
      await get().loadPublicationHistory(projectId, publicationId)
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to update publication status:', err)
      throw err
    }
  },

  loadPublicationHistory: async (projectId, publicationId) => {
    if (!projectId || !publicationId) return
    set({ isLoadingStatus: true })
    try {
      const history: any = await api.blueprint.getPublicationHistory(projectId, publicationId)
      set({
        statusHistory: Array.isArray(history) ? history : [],
        isLoadingStatus: false
      })
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to load publication history:', err)
      set({ isLoadingStatus: false })
    }
  },

  setPublicationStatus: (status) => set({ publicationStatus: status }),
  setActivePublicationId: (publicationId) => set({ activePublicationId: publicationId })
}))
