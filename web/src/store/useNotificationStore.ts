import { create } from 'zustand'
import { api } from '@/lib/api'

export interface NotificationItem {
  id: string
  user_id?: string
  project_id?: string
  source_type: 'blueprint' | 'session'
  event_type: string
  category: 'critical' | 'important' | 'digest' | 'presence'
  entity_type: string
  entity_id?: string
  title: string
  body: string
  metadata_json?: Record<string, any>
  read_at?: string
  created_at: string
  delivered_email_at?: string
  delivered_digest_at?: string
}

export interface NotificationPreferences {
  id?: string
  user_id?: string
  project_id?: string
  email_enabled: boolean
  digest_enabled: boolean
  allow_blueprint_events: boolean
  allow_session_events: boolean
  allow_critical: boolean
  allow_important: boolean
  allow_digest: boolean
  quiet_hours_json?: Record<string, any>
}

export interface DigestPreviewData {
  project_id?: string
  subject: string
  event_count: number
  blueprint_count: number
  session_count: number
  digest_html: string
  digest_text: string
}

export type NotificationTab = 'all' | 'blueprint' | 'session' | 'unread'

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  preferences: NotificationPreferences | null
  digestPreview: DigestPreviewData | null
  isLoading: boolean
  isDrawerOpen: boolean
  activeTab: NotificationTab

  // Actions
  toggleDrawer: (open?: boolean) => void
  setActiveTab: (tab: NotificationTab) => void
  fetchNotifications: (projectId?: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: (projectId?: string) => Promise<void>
  fetchPreferences: (projectId?: string) => Promise<void>
  savePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>
  loadDigestPreview: (projectId?: string, hours?: number) => Promise<void>
  sendTestNotification: (projectId?: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  preferences: null,
  digestPreview: null,
  isLoading: false,
  isDrawerOpen: false,
  activeTab: 'all',

  toggleDrawer: (open) => set(state => ({
    isDrawerOpen: open !== undefined ? open : !state.isDrawerOpen
  })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchNotifications: async (projectId) => {
    set({ isLoading: true })
    try {
      const res: any = await api.notifications.list({ project_id: projectId, limit: 30 })
      set({
        notifications: res.items || [],
        unreadCount: res.unread_count || 0
      })
    } catch (err) {
      console.error('[STAGE Notifications] Fetch error:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  markRead: async (id) => {
    try {
      const updated: any = await api.notifications.markRead(id)
      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? updated : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (err) {
      console.error('[STAGE Notifications] Mark read error:', err)
    }
  },

  markAllRead: async (projectId) => {
    try {
      await api.notifications.markAllRead(projectId)
      const now = new Date().toISOString()
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read_at: n.read_at || now })),
        unreadCount: 0
      }))
    } catch (err) {
      console.error('[STAGE Notifications] Mark all read error:', err)
    }
  },

  fetchPreferences: async (projectId) => {
    try {
      const res: any = await api.notifications.getPreferences(projectId)
      set({ preferences: res })
    } catch (err) {
      console.error('[STAGE Notifications] Fetch preferences error:', err)
    }
  },

  savePreferences: async (prefs) => {
    try {
      const updated: any = await api.notifications.updatePreferences(prefs)
      set({ preferences: updated })
    } catch (err) {
      console.error('[STAGE Notifications] Save preferences error:', err)
    }
  },

  loadDigestPreview: async (projectId, hours = 24) => {
    try {
      const res: any = await api.notifications.previewDigest(projectId, hours)
      set({ digestPreview: res })
    } catch (err) {
      console.error('[STAGE Notifications] Digest preview error:', err)
    }
  },

  sendTestNotification: async (projectId) => {
    try {
      await api.notifications.sendTestEmail(projectId)
      await get().fetchNotifications(projectId)
    } catch (err) {
      console.error('[STAGE Notifications] Test email error:', err)
    }
  }
}))
