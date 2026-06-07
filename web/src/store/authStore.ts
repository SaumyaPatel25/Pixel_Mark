import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  name?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.auth.login(email, password)
          const token = res.access_token
          localStorage.setItem('pm_token', token)
          document.cookie = `pm_token=${token}; path=/; max-age=604800; samesite=lax`
          set({ token })
          const meRes = await api.auth.me()
          set({ user: meRes })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true })
        try {
          const res = await api.auth.register(email, password, name)
          const token = res.access_token
          localStorage.setItem('pm_token', token)
          document.cookie = `pm_token=${token}; path=/; max-age=604800; samesite=lax`
          set({ token })
          const meRes = await api.auth.me()
          set({ user: meRes })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: () => {
        localStorage.removeItem('pm_token')
        document.cookie = 'pm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        set({ user: null, token: null })
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
    }),
    {
      name: 'pm_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
