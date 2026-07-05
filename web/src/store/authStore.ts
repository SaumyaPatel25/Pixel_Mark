import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import { posthog } from '@/lib/posthog'

interface User {
  id: string
  email: string
  name?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isVerifying: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<{ 
    message: string
    dev_link?: string
    access_token?: string
    token_type?: string
    user?: User
  }>
  verifyEmail: (token: string) => Promise<void>
  oauthLogin: (token: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isVerifying: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.auth.login(email, password)
          const token = res.access_token
          document.cookie = `pm_token=${token}; path=/; max-age=604800; samesite=lax`
          set({ token, user: res.user })
          // Identify the user in PostHog
          if (typeof window !== 'undefined' && res.user) {
            posthog.identify(res.user.id, { email: res.user.email, name: res.user.name ?? undefined })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true })
        try {
          const res = await api.auth.register(email, password, name)
          if (res.access_token) {
            const token = res.access_token
            document.cookie = `pm_token=${token}; path=/; max-age=604800; samesite=lax`
            set({ token, user: res.user })
            if (typeof window !== 'undefined' && res.user) {
              posthog.identify(res.user.id, { email: res.user.email, name: res.user.name ?? undefined })
            }
          }
          return res
        } finally {
          set({ isLoading: false })
        }
      },

      verifyEmail: async (token) => {
        set({ isVerifying: true })
        try {
          await api.auth.verifyEmail(token)
        } finally {
          set({ isVerifying: false })
        }
      },

      logout: () => {
        document.cookie = 'pm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        set({ user: null, token: null })
        // Reset PostHog — severs link between anonymous and identified session
        if (typeof window !== 'undefined') posthog.reset()
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const meRes = await api.auth.me()
          set({ user: meRes })
        } catch (err) {
          get().logout()
        } finally {
          set({ isLoading: false })
        }
      },

      oauthLogin: async (token) => {
        set({ isLoading: true })
        try {
          document.cookie = `pm_token=${token}; path=/; max-age=604800; samesite=lax`
          set({ token })
          const meRes = await api.auth.me()
          set({ user: meRes })
          if (typeof window !== 'undefined') {
            posthog.identify(meRes.id, { email: meRes.email, name: meRes.name ?? undefined })
          }
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'pm_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
