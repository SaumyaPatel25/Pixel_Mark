import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export interface NotificationItem {
  id: string
  user_id?: string
  project_id?: string
  source_type: 'blueprint' | 'session' | string
  event_type: string
  category?: 'critical' | 'important' | 'digest' | 'presence' | string
  entity_type: string
  entity_id?: string
  title: string
  body: string
  actor_name?: string
  target_name?: string
  marker_id?: string
  frame_id?: string
  page_url?: string
  metadata_json?: Record<string, any>
  read_at?: string | null
  created_at: string
  delivered_email_at?: string
  delivered_digest_at?: string
}

export interface NotificationPreferences {
  id?: string
  user_id?: string
  project_id?: string
  in_app_enabled: boolean
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

export interface TemplatePreviewData {
  source_type: string
  event_type: string
  tone: string
  subject: string
  body: string
  preview_text: string
  why_you_got_this: string
}

export interface DeliveryAttemptItem {
  id: string
  notification_event_id: string
  channel: string
  status: 'queued' | 'sent' | 'failed' | 'retrying' | 'dead_letter'
  attempt_number: number
  provider_message_id?: string
  error_code?: string
  error_message?: string
  next_retry_at?: string
  created_at: string
  updated_at: string
  sent_at?: string
}

export interface DeliverySummaryData {
  total_attempts: number
  queued: number
  sent: number
  failed: number
  retrying: number
  dead_letter: number
  health_status: 'healthy' | 'warnings' | 'critical_failures'
}

export type NotificationTab = 'all' | 'blueprint' | 'session' | 'unread'

export interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  preferences: NotificationPreferences | null
  digestPreview: DigestPreviewData | null
  templatePreview: TemplatePreviewData | null
  deliveries: DeliveryAttemptItem[]
  deliverySummary: DeliverySummaryData | null
  isLoading: boolean
  isDrawerOpen: boolean
  activeTab: NotificationTab
  hasHydrated: boolean

  // Actions
  toggleDrawer: (open?: boolean) => void
  setActiveTab: (tab: NotificationTab) => void
  addNotification: (notification: Partial<NotificationItem> & Record<string, any>) => void
  markAsRead: (id: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllAsRead: (projectId?: string) => Promise<void>
  markAllRead: (projectId?: string) => Promise<void>
  fetchNotifications: (projectId?: string) => Promise<void>
  fetchPreferences: (projectId?: string) => Promise<void>
  savePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>
  loadDigestPreview: (projectId?: string, hours?: number) => Promise<void>
  loadTemplatePreview: (sourceType?: string, eventType?: string, tone?: string) => Promise<void>
  fetchDeliveries: (status?: string) => Promise<void>
  fetchDeliverySummary: () => Promise<void>
  retryDelivery: (attemptId: string) => Promise<void>
  retryAllFailed: () => Promise<void>
  sendTestNotification: (projectId?: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      preferences: null,
      digestPreview: null,
      templatePreview: null,
      deliveries: [],
      deliverySummary: null,
      isLoading: false,
      isDrawerOpen: false,
      activeTab: 'all',
      hasHydrated: false,

      toggleDrawer: (open) => set(state => ({
        isDrawerOpen: open !== undefined ? open : !state.isDrawerOpen
      })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      addNotification: (raw) => {
        const id = raw.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        
        // Extract actor name and event type
        const meta = raw.metadata_json || raw.metadata || {}
        const actorName = raw.actor_name || raw.actorName || raw.creator_name || raw.author_name || meta.actor_name || meta.author_name || undefined
        const eventType = raw.event_type || raw.eventType || 'New activity'
        const markerId = raw.marker_id || raw.markerId || (raw.entity_type === 'marker' ? raw.entity_id : undefined)
        const frameId = raw.frame_id || raw.frameId || (raw.entity_type === 'frame' ? raw.entity_id : undefined)
        const pageUrl = raw.page_url || raw.pageUrl || meta.page_url || undefined
        
        let title = raw.title || ''
        if (!title) {
          title = actorName ? `${actorName}: ${eventType}` : eventType
        }

        const body = raw.body || raw.message || raw.description || ''

        const newItem: NotificationItem = {
          id,
          user_id: raw.user_id,
          project_id: raw.project_id,
          source_type: raw.source_type || (frameId ? 'blueprint' : 'session'),
          event_type: eventType,
          category: raw.category || 'important',
          entity_type: raw.entity_type || (markerId ? 'marker' : frameId ? 'frame' : 'activity'),
          entity_id: raw.entity_id || markerId || frameId,
          title,
          body,
          actor_name: actorName,
          target_name: raw.target_name || raw.targetName || raw.element_tag || meta.target_selector,
          marker_id: markerId,
          frame_id: frameId,
          page_url: pageUrl,
          metadata_json: meta,
          read_at: raw.read_at || null,
          created_at: raw.created_at || new Date().toISOString(),
          delivered_email_at: raw.delivered_email_at,
          delivered_digest_at: raw.delivered_digest_at
        }

        set(state => {
          // Prevent duplicates
          if (state.notifications.some(n => n.id === newItem.id)) {
            return state
          }
          // Prepend new notification immutably (keep max 100 in memory)
          const updated = [newItem, ...state.notifications].slice(0, 100)
          return {
            notifications: updated,
            unreadCount: state.unreadCount + (newItem.read_at ? 0 : 1)
          }
        })
      },

      markAsRead: async (id) => {
        // Optimistic update
        set(state => {
          let wasUnread = false
          const next = state.notifications.map(n => {
            if (n.id === id) {
              if (!n.read_at) wasUnread = true
              return { ...n, read_at: new Date().toISOString() }
            }
            return n
          })
          return {
            notifications: next,
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
          }
        })

        // Server sync
        try {
          if (api.notifications?.markRead) {
            await api.notifications.markRead(id)
          }
        } catch (err) {
          console.warn('[STAGE Notifications] Mark read server sync failed (using local):', err)
        }
      },

      markRead: async (id) => {
        return get().markAsRead(id)
      },

      markAllAsRead: async (projectId) => {
        const now = new Date().toISOString()
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read_at: n.read_at || now })),
          unreadCount: 0
        }))

        try {
          if (api.notifications?.markAllRead) {
            await api.notifications.markAllRead(projectId)
          }
        } catch (err) {
          console.warn('[STAGE Notifications] Mark all read server sync failed (using local):', err)
        }
      },

      markAllRead: async (projectId) => {
        return get().markAllAsRead(projectId)
      },

      fetchNotifications: async (projectId) => {
        set({ isLoading: true })
        try {
          if (api.notifications?.list) {
            const res: any = await api.notifications.list({ project_id: projectId, limit: 50 })
            if (res && Array.isArray(res.items)) {
              set(state => {
                // Merge server items with local unread notifications
                const serverMap = new Map(res.items.map((item: NotificationItem) => [item.id, item]))
                const localOnly = state.notifications.filter(n => !serverMap.has(n.id))
                const merged = [...localOnly, ...res.items].slice(0, 100)
                const unread = merged.filter(n => !n.read_at).length

                return {
                  notifications: merged,
                  unreadCount: typeof res.unread_count === 'number' ? res.unread_count : unread
                }
              })
            }
          }
        } catch (err) {
          console.warn('[STAGE Notifications] Fetch notifications failed, relying on cached store:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      fetchPreferences: async (projectId) => {
        try {
          if (api.notifications?.getPreferences) {
            const res: any = await api.notifications.getPreferences(projectId)
            set({ preferences: res })
          }
        } catch (err) {
          console.error('[STAGE Notifications] Fetch preferences error:', err)
        }
      },

      savePreferences: async (prefs) => {
        try {
          if (api.notifications?.updatePreferences) {
            const updated: any = await api.notifications.updatePreferences(prefs)
            set({ preferences: updated })
          }
        } catch (err) {
          console.error('[STAGE Notifications] Save preferences error:', err)
        }
      },

      loadDigestPreview: async (projectId, hours = 24) => {
        try {
          if (api.notifications?.previewDigest) {
            const res: any = await api.notifications.previewDigest(projectId, hours)
            set({ digestPreview: res })
          }
        } catch (err) {
          console.error('[STAGE Notifications] Digest preview error:', err)
        }
      },

      sendTestNotification: async (projectId) => {
        try {
          if (api.notifications?.sendTestEmail) {
            await api.notifications.sendTestEmail(projectId)
            await get().fetchNotifications(projectId)
          }
        } catch (err) {
          console.error('[STAGE Notifications] Test email error:', err)
        }
      },

      loadTemplatePreview: async (sourceType = 'blueprint', eventType = 'comment_created', tone = 'client_friendly') => {
        try {
          if (api.notifications?.previewTemplate) {
            const res: any = await api.notifications.previewTemplate({ source_type: sourceType, event_type: eventType, tone })
            set({ templatePreview: res })
          }
        } catch (err) {
          console.error('[STAGE Notifications] Template preview error:', err)
        }
      },

      fetchDeliveries: async (status) => {
        try {
          if (api.notifications?.getDeliveries) {
            const res: any = await api.notifications.getDeliveries(status)
            set({
              deliveries: res.items || [],
              deliverySummary: res.summary || null
            })
          }
        } catch (err) {
          console.error('[STAGE Notifications] Fetch deliveries error:', err)
        }
      },

      fetchDeliverySummary: async () => {
        try {
          if (api.notifications?.getDeliverySummary) {
            const res: any = await api.notifications.getDeliverySummary()
            set({ deliverySummary: res })
          }
        } catch (err) {
          console.error('[STAGE Notifications] Fetch delivery summary error:', err)
        }
      },

      retryDelivery: async (attemptId) => {
        try {
          if (api.notifications?.retryDelivery) {
            await api.notifications.retryDelivery(attemptId)
            await get().fetchDeliveries()
          }
        } catch (err) {
          console.error('[STAGE Notifications] Retry delivery error:', err)
        }
      },

      retryAllFailed: async () => {
        try {
          if (api.notifications?.retryAllFailed) {
            await api.notifications.retryAllFailed()
            await get().fetchDeliveries()
          }
        } catch (err) {
          console.error('[STAGE Notifications] Retry all failed error:', err)
        }
      }
    }),
    {
      name: 'stage-notifications-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50),
        unreadCount: state.unreadCount
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true
        }
      }
    }
  )
)
