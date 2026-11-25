'use client'

import React, { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { NotificationDrawer } from './NotificationDrawer'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  projectId?: string
  className?: string
}

export function NotificationBell({ projectId, className = '' }: NotificationBellProps) {
  const {
    unreadCount,
    isDrawerOpen,
    toggleDrawer,
    fetchNotifications
  } = useNotificationStore()

  useEffect(() => {
    fetchNotifications(projectId)
  }, [projectId, fetchNotifications])

  return (
    <>
      <button
        type="button"
        onClick={() => toggleDrawer()}
        className={cn(
          "relative p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white/70 hover:text-white transition-all shadow-sm cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-95",
          isDrawerOpen && "bg-white/[0.08] border-purple-500/50 text-white",
          className
        )}
        title="Notifications"
        aria-label="Toggle Activity & Notifications"
        aria-expanded={isDrawerOpen}
      >
        <Bell className="w-4 h-4 text-purple-300 group-hover:scale-105 transition-transform" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-lg shadow-purple-500/40 border border-[#0d111a] ring-2 ring-purple-500/20 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Drawer */}
      <NotificationDrawer projectId={projectId} />
    </>
  )
}
