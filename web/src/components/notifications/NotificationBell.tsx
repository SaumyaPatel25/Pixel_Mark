'use client'

import React, { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { NotificationDrawer } from './NotificationDrawer'

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

  // Fetch initial notifications on mount
  useEffect(() => {
    fetchNotifications(projectId)
  }, [projectId, fetchNotifications])

  return (
    <>
      {/* Elementor-style Polished Bell Trigger */}
      <button
        onClick={() => toggleDrawer()}
        className={`relative p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:bg-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer group focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${className}`}
        title="STAGE Notifications"
        aria-label="Toggle STAGE Notifications"
        aria-expanded={isDrawerOpen}
      >
        <Bell className="w-4 h-4 text-cyan-400 group-hover:scale-105 transition-transform" />

        {/* Dynamic Red Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono flex items-center justify-center animate-pulse shadow-md shadow-rose-500/40 border border-[#090d16]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Render Slide-out Drawer */}
      <NotificationDrawer projectId={projectId} />
    </>
  )
}
