import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import { posthog } from '@/lib/posthog'
import { syncMonkfeedLogin, syncMonkfeedLogout } from '@/lib/monkfeed-sync'

export interface LinkedProvider {
  id: string
  provider: string
  provider_user_id: string
  provider_email: string
  email_verified: boolean
  created_at?: string | null
}

export interface User {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
  is_verified?: boolean
  created_at?: string | null
  last_login_at?: string | null
  onboarding_state_json?: Record<string, any> | null
  preferences_json?: Record<string, any> | null
  identities?: LinkedProvider[]
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isVerifying: boolean
  hasHydrated: boolean
  setHasHydrated: (hasHydrated: boolean) => void
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
  firebaseSync: (idToken: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isVerifying: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.auth.login(email, password)
          const token = res.access_token
          document.cookie = `stagetoken=${token}; path=/; max-age=604800; samesite=lax`
          set({ token, user: res.user })
          if (typeof window !== 'undefined' && res.user) {
            posthog.identify(res.user.id, { email: res.user.email, name: res.user.name ?? undefined })
            syncMonkfeedLogin(res.user)
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
            document.cookie = `stagetoken=${token}; path=/; max-age=604800; samesite=lax`
            set({ token, user: res.user })
            if (typeof window !== 'undefined' && res.user) {
              posthog.identify(res.user.id, { email: res.user.email, name: res.user.name ?? undefined })
              syncMonkfeedLogin(res.user)
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

      logout: async () => {
        try {
          const { signOut } = await import('firebase/auth')
          const { auth } = await import('@/lib/firebase')
          await signOut(auth)
        } catch (err) {
          console.warn('[AuthStore] Firebase signOut notice:', err)
        }
        document.cookie = 'stagetoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'pm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'pmtoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        if (typeof window !== 'undefined') {
          localStorage.removeItem('stage_auth')
        }
        set({ user: null, token: null, isLoading: false })
        if (typeof window !== 'undefined') {
          posthog.reset()
          syncMonkfeedLogout()
        }
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const meRes = await api.auth.me()
          set({ user: meRes })
          if (meRes) {
            syncMonkfeedLogin(meRes)
          }
        } catch (err: any) {
          console.warn('[AuthStore] fetchMe failed:', err)
          if (err?.status === 401) {
            await get().logout()
          }
        } finally {
          set({ isLoading: false })
        }
      },

      oauthLogin: async (token) => {
        set({ isLoading: true })
        try {
          document.cookie = `stagetoken=${token}; path=/; max-age=604800; samesite=lax`
          set({ token })
          const meRes = await api.auth.me()
          set({ user: meRes })
          if (typeof window !== 'undefined') {
            posthog.identify(meRes.id, { email: meRes.email, name: meRes.name ?? undefined })
            if (meRes) {
              syncMonkfeedLogin(meRes)
            }
          }
        } finally {
          set({ isLoading: false })
        }
      },

      firebaseSync: async (idToken, name) => {
        set({ isLoading: true })
        try {
          const res = await api.auth.firebaseSync(idToken, name)
          const token = res.access_token
          document.cookie = `stagetoken=${token}; path=/; max-age=604800; samesite=lax`
          set({ token, user: res.user })
          if (typeof window !== 'undefined' && res.user) {
            posthog.identify(res.user.id, { email: res.user.email, name: res.user.name ?? undefined })
            syncMonkfeedLogin(res.user)
          }
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'stage_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true)
          if (typeof document !== 'undefined' && state.token) {
            const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('stagetoken='))
            if (!hasCookie) {
              document.cookie = `stagetoken=${state.token}; path=/; max-age=604800; samesite=lax`
            }
          }
        }
      },
    }
  )
)
