'use client'

import React from 'react'
import { Users } from 'lucide-react'
import { useBlueprintPresenceStore } from '@/store/useBlueprintPresenceStore'

export function BlueprintPresenceStack() {
  const { activeUsers, isConnected } = useBlueprintPresenceStore()

  const userList = Object.values(activeUsers)
  const visibleUsers = userList.slice(0, 4)
  const hiddenCount = Math.max(0, userList.length - 4)

  function getInitials(name: string) {
    if (!name) return 'S'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Live connection status */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-300"
        title={isConnected ? 'STAGE Blueprint Presence Active' : 'Connecting to presence server...'}
      >
        {isConnected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-mono hidden sm:inline">LIVE PRESENCE</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-amber-400 font-mono hidden sm:inline">CONNECTING</span>
          </>
        )}
      </div>

      {/* Avatar Stack */}
      {userList.length > 0 && (
        <div className="flex items-center -space-x-2 overflow-hidden p-0.5">
          {visibleUsers.map((user) => (
            <div
              key={user.userId}
              className="relative group cursor-pointer"
              title={`STAGE Collaborator: ${user.name}`}
            >
              <div
                style={{ backgroundColor: user.color }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md border-2 border-[#0d1322] transition-transform hover:scale-110 hover:z-10"
              >
                {getInitials(user.name)}
              </div>

              {/* Hover Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none animate-in fade-in">
                <div className="bg-[#090d16] border border-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.color }} />
                  <span>{user.name}</span>
                </div>
              </div>
            </div>
          ))}

          {hiddenCount > 0 && (
            <div
              className="w-7 h-7 rounded-full bg-slate-800 border-2 border-[#0d1322] flex items-center justify-center text-slate-300 text-[9px] font-bold"
              title={`${hiddenCount} more collaborator(s)`}
            >
              +{hiddenCount}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
