import { create } from 'zustand'
import {
  AIProviderConfig,
  CreateAIProviderConfigInput,
  UpdateAIProviderConfigInput,
} from '../types/ai-provider'
import { posthog } from '@/lib/posthog'
import {
  getAIProviderConfigs,
  createAIProviderConfig,
  updateAIProviderConfig,
  deleteAIProviderConfig,
  setDefaultAIProviderConfig,
  testAIProviderConfig,
} from '../lib/api'

interface AIProviderState {
  configs: AIProviderConfig[]
  isLoading: boolean
  isSaving: boolean
  isTestingId: string | null
  error: string | null
  
  fetchConfigs: () => Promise<void>
  createConfig: (data: CreateAIProviderConfigInput) => Promise<void>
  updateConfig: (id: string, data: UpdateAIProviderConfigInput) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  setDefaultConfig: (id: string) => Promise<void>
  testConfig: (id: string) => Promise<{ success: boolean; message: string }>
}

export const useAIProviderStore = create<AIProviderState>((set, get) => ({
  configs: [],
  isLoading: false,
  isSaving: false,
  isTestingId: null,
  error: null,

  fetchConfigs: async () => {
    set({ isLoading: true, error: null })
    try {
      const configs = await getAIProviderConfigs()
      set({ configs, isLoading: false })
    } catch (err) {
      const error = err as Error
      set({ error: error.message || 'Failed to fetch configs', isLoading: false })
    }
  },

  createConfig: async (data) => {
    posthog.capture('ai_provider_create_started', { provider: data.provider })
    set({ isSaving: true, error: null })
    try {
      const config = await createAIProviderConfig(data)
      posthog.capture('ai_provider_create_succeeded', {
        provider: config.provider,
        is_default: config.is_default,
        supports_openai_compat: config.supports_openai_compat
      })
      await get().fetchConfigs()
    } catch (err) {
      set({ error: (err as any).message || 'Failed to create config' })
      throw err
    } finally {
      set({ isSaving: false })
    }
  },

  updateConfig: async (id, data) => {
    set({ isSaving: true, error: null })
    try {
      const config = await updateAIProviderConfig(id, data)
      posthog.capture('ai_provider_update_succeeded', {
        provider: config.provider,
        is_default: config.is_default,
        is_active: config.is_active
      })
      await get().fetchConfigs()
    } catch (err) {
      const error = err as Error
      set({ error: error.message || 'Failed to update config' })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  deleteConfig: async (id) => {
    const existing = get().configs.find(c => c.id === id)
    const provider = existing ? existing.provider : 'unknown'
    const was_default = existing ? existing.is_default : false
    set({ isSaving: true, error: null })
    try {
      await deleteAIProviderConfig(id)
      posthog.capture('ai_provider_deleted', {
        provider,
        was_default
      })
      await get().fetchConfigs()
    } catch (err) {
      const error = err as Error
      set({ error: error.message || 'Failed to delete config' })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  setDefaultConfig: async (id) => {
    const existing = get().configs.find(c => c.id === id)
    const provider = existing ? existing.provider : 'unknown'
    set({ isSaving: true, error: null })
    try {
      await setDefaultAIProviderConfig(id)
      posthog.capture('ai_provider_set_default', {
        provider
      })
      await get().fetchConfigs()
    } catch (err) {
      const error = err as Error
      set({ error: error.message || 'Failed to set default config' })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  testConfig: async (id) => {
    const existing = get().configs.find(c => c.id === id)
    const provider = existing ? existing.provider : 'unknown'
    posthog.capture('ai_provider_test_started', { provider })
    set({ isTestingId: id, error: null })
    try {
      const res = await testAIProviderConfig(id)
      if (res.success) {
        posthog.capture('ai_provider_test_succeeded', { provider })
      } else {
        const msg = (res.message || '').toLowerCase()
        let failure_type: "unreachable" | "unsupported" | "auth" | "unknown" = "unknown"
        if (msg.includes("not implemented")) {
          failure_type = "unsupported"
        } else if (msg.includes("could not reach") || msg.includes("unreachable") || msg.includes("connect")) {
          failure_type = "unreachable"
        } else if (msg.includes("auth") || msg.includes("unauthorized") || msg.includes("invalid api key") || msg.includes("api_key")) {
          failure_type = "auth"
        }
        posthog.capture('ai_provider_test_failed', { provider, failure_type })
      }
      return res
    } catch (err) {
      const error = err as Error
      posthog.capture('ai_provider_test_failed', { provider, failure_type: "unknown" })
      return { success: false, message: error.message || 'Test failed completely' }
    } finally {
      set({ isTestingId: null })
    }
  },
}))
