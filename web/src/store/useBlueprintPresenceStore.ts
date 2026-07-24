import { create } from 'zustand'

export interface RemoteUserCursor {
  x: number
  y: number
  frameId?: string
  lastUpdated: number
}

export interface RemoteUserSelection {
  frameId?: string
  targetSelector?: string
}

export interface BlueprintUserPresence {
  userId: string
  name: string
  color: string
  avatarUrl?: string
  cursor?: RemoteUserCursor
  selection?: RemoteUserSelection
  connectedAt?: number
}

interface BlueprintPresenceState {
  activeUsers: Record<string, BlueprintUserPresence>
  localUserId: string
  localUserName: string
  localUserColor: string
  isConnected: boolean

  // Actions
  setConnected: (connected: boolean) => void
  setLocalUser: (userId: string, name: string, color?: string) => void
  setPresenceState: (users: any[]) => void
  addOrUpdateUser: (user: Partial<BlueprintUserPresence> & { userId: string }) => void
  removeUser: (userId: string) => void
  setRemoteCursor: (userId: string, cursor: { x: number; y: number; frameId?: string }) => void
  setRemoteSelection: (userId: string, selection: { frameId?: string; targetSelector?: string }) => void
  reset: () => void
}

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#06b6d4', '#6366f1', '#f43f5e', '#14b8a6', '#a855f7'
]

function getRandomColor() {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
}

export const useBlueprintPresenceStore = create<BlueprintPresenceState>((set, get) => ({
  activeUsers: {},
  localUserId: `usr_${Math.random().toString(36).substring(2, 9)}`,
  localUserName: 'STAGE Collaborator',
  localUserColor: getRandomColor(),
  isConnected: false,

  setConnected: (connected) => set({ isConnected: connected }),

  setLocalUser: (userId, name, color) => set({
    localUserId: userId,
    localUserName: name,
    localUserColor: color || get().localUserColor
  }),

  setPresenceState: (usersList) => {
    const localId = get().localUserId
    const map: Record<string, BlueprintUserPresence> = {}
    if (Array.isArray(usersList)) {
      usersList.forEach(u => {
        const id = u.user_id || u.userId
        if (id && id !== localId) {
          map[id] = {
            userId: id,
            name: u.name || 'STAGE Collaborator',
            color: u.color || getRandomColor(),
            avatarUrl: u.avatar_url || u.avatarUrl
          }
        }
      })
    }
    set({ activeUsers: map })
  },

  addOrUpdateUser: (user) => {
    const localId = get().localUserId
    if (user.userId === localId) return

    set(state => {
      const existing = state.activeUsers[user.userId] || {
        userId: user.userId,
        name: user.name || 'STAGE Collaborator',
        color: user.color || getRandomColor()
      }
      return {
        activeUsers: {
          ...state.activeUsers,
          [user.userId]: {
            ...existing,
            ...user
          }
        }
      }
    })
  },

  removeUser: (userId) => {
    set(state => {
      const copy = { ...state.activeUsers }
      delete copy[userId]
      return { activeUsers: copy }
    })
  },

  setRemoteCursor: (userId, cursorData) => {
    const localId = get().localUserId
    if (userId === localId) return

    set(state => {
      const user = state.activeUsers[userId]
      if (!user) return state

      return {
        activeUsers: {
          ...state.activeUsers,
          [userId]: {
            ...user,
            cursor: {
              ...cursorData,
              lastUpdated: Date.now()
            }
          }
        }
      }
    })
  },

  setRemoteSelection: (userId, selectionData) => {
    const localId = get().localUserId
    if (userId === localId) return

    set(state => {
      const user = state.activeUsers[userId]
      if (!user) return state

      return {
        activeUsers: {
          ...state.activeUsers,
          [userId]: {
            ...user,
            selection: selectionData
          }
        }
      }
    })
  },

  reset: () => set({ activeUsers: {}, isConnected: false })
}))
