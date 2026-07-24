import { create } from 'zustand'
import { api } from '@/lib/api'

export interface BlueprintActivityItem {
  id: string
  project_id: string
  actor_id?: string
  actor_name: string
  event_type: string
  target_type: string
  target_id?: string
  summary_text: string
  metadata_json?: Record<string, any>
  created_at: string
}

export type ActivityFilter = 'all' | 'edit' | 'publication' | 'comment' | 'presence'

interface BlueprintActivityState {
  events: BlueprintActivityItem[]
  isLoading: boolean
  hasMore: boolean
  nextCursor: string | null
  filterType: ActivityFilter
  isActivityPanelOpen: boolean

  // Actions
  toggleActivityPanel: (open?: boolean) => void
  setFilterType: (filter: ActivityFilter, projectId?: string) => void
  fetchActivity: (projectId: string, reset?: boolean) => Promise<void>
  loadMore: (projectId: string) => Promise<void>
  appendRealtimeEvent: (event: BlueprintActivityItem) => void
}

export const useBlueprintActivityStore = create<BlueprintActivityState>((set, get) => ({
  events: [],
  isLoading: false,
  hasMore: false,
  nextCursor: null,
  filterType: 'all',
  isActivityPanelOpen: false,

  toggleActivityPanel: (open) => set(state => ({
    isActivityPanelOpen: open !== undefined ? open : !state.isActivityPanelOpen
  })),

  setFilterType: (filter, projectId) => {
    set({ filterType: filter })
    if (projectId) {
      get().fetchActivity(projectId, true)
    }
  },

  fetchActivity: async (projectId, reset = false) => {
    if (!projectId) return
    set({ isLoading: true })
    try {
      const filter = get().filterType
      const targetTypeParam = filter === 'all' ? undefined : filter

      const res: any = await api.blueprint.getActivity(projectId, {
        limit: 20,
        target_type: targetTypeParam
      })

      set({
        events: res.items || [],
        hasMore: !!res.has_more,
        nextCursor: res.next_cursor || null
      })
    } catch (err) {
      console.error('[STAGE Blueprint Activity] Fetch error:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  loadMore: async (projectId) => {
    const { nextCursor, isLoading, hasMore, filterType, events } = get()
    if (!projectId || isLoading || !hasMore || !nextCursor) return

    set({ isLoading: true })
    try {
      const targetTypeParam = filterType === 'all' ? undefined : filterType

      const res: any = await api.blueprint.getActivity(projectId, {
        limit: 20,
        before: nextCursor,
        target_type: targetTypeParam
      })

      const newItems = res.items || []
      set({
        events: [...events, ...newItems],
        hasMore: !!res.has_more,
        nextCursor: res.next_cursor || null
      })
    } catch (err) {
      console.error('[STAGE Blueprint Activity] Load more error:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  appendRealtimeEvent: (event) => {
    const { filterType, events } = get()
    if (filterType !== 'all' && event.target_type !== filterType) return
    if (events.some(e => e.id === event.id)) return

    set({ events: [event, ...events] })
  }
}))
