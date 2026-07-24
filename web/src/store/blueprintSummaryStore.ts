import { create } from 'zustand'
import { api } from '@/lib/api'

export interface BlueprintSummaryItem {
  id: string
  project_id: string
  blueprint_publication_id?: string
  generated_for_type: string
  input_range_json?: Record<string, any>
  title: string
  summary_text: string
  bullets_json?: string[]
  risks_json?: string[]
  followups_json?: string[]
  model_name: string
  tokens_estimate?: number
  created_at: string
  created_by?: string
}

export type SummaryTone = 'client_friendly' | 'concise' | 'detailed'

interface BlueprintSummaryState {
  summaries: BlueprintSummaryItem[]
  activeSummary: BlueprintSummaryItem | null
  isGenerating: boolean
  generationError: string | null
  isSummaryModalOpen: boolean
  currentTone: SummaryTone

  // Actions
  toggleSummaryModal: (open?: boolean) => void
  setCurrentTone: (tone: SummaryTone) => void
  setActiveSummary: (summary: BlueprintSummaryItem | null) => void
  generateSummary: (projectId: string, options?: { publicationId?: string; editIds?: string[]; tone?: SummaryTone }) => Promise<BlueprintSummaryItem | null>
  fetchSummaries: (projectId: string) => Promise<void>
  fetchPublicationSummary: (publicationId: string) => Promise<BlueprintSummaryItem | null>
}

export const useBlueprintSummaryStore = create<BlueprintSummaryState>((set, get) => ({
  summaries: [],
  activeSummary: null,
  isGenerating: false,
  generationError: null,
  isSummaryModalOpen: false,
  currentTone: 'client_friendly',

  toggleSummaryModal: (open) => set(state => ({
    isSummaryModalOpen: open !== undefined ? open : !state.isSummaryModalOpen
  })),

  setCurrentTone: (tone) => set({ currentTone: tone }),

  setActiveSummary: (summary) => set({ activeSummary: summary }),

  generateSummary: async (projectId, options) => {
    if (!projectId) return null
    set({ isGenerating: true, generationError: null })
    try {
      const tone = options?.tone || get().currentTone
      const res: any = await api.blueprint.generateSummary(projectId, {
        publication_id: options?.publicationId,
        edit_ids: options?.editIds,
        tone: tone,
        audience: 'client'
      })

      set(state => ({
        activeSummary: res,
        summaries: [res, ...state.summaries],
        isSummaryModalOpen: true
      }))
      return res
    } catch (err: any) {
      console.error('[STAGE Blueprint Summary] Generation error:', err)
      set({ generationError: err.message || 'Failed to generate AI change summary' })
      return null
    } finally {
      set({ isGenerating: false })
    }
  },

  fetchSummaries: async (projectId) => {
    if (!projectId) return
    try {
      const res: any = await api.blueprint.getSummaries(projectId)
      set({ summaries: res || [] })
      if (!get().activeSummary && res && res.length > 0) {
        set({ activeSummary: res[0] })
      }
    } catch (err) {
      console.error('[STAGE Blueprint Summary] Fetch error:', err)
    }
  },

  fetchPublicationSummary: async (publicationId) => {
    if (!publicationId) return null
    try {
      const res: any = await api.blueprint.getPublicationSummary(publicationId)
      if (res) {
        set({ activeSummary: res })
      }
      return res
    } catch (err) {
      console.error('[STAGE Blueprint Summary] Fetch publication summary error:', err)
      return null
    }
  }
}))
