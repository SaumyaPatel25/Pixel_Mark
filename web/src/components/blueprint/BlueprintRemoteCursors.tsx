'use client'

import React from 'react'
import { useBlueprintPresenceStore } from '@/store/useBlueprintPresenceStore'

interface BlueprintRemoteCursorsProps {
  panX: number
  panY: number
  zoom: number
}

export function BlueprintRemoteCursors({ panX, panY, zoom }: BlueprintRemoteCursorsProps) {
  const { activeUsers } = useBlueprintPresenceStore()
  const userList = Object.values(activeUsers).filter(u => u.cursor && (Date.now() - (u.cursor.lastUpdated || 0) < 20000))

  if (userList.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {userList.map((user) => {
        const cursor = user.cursor!
        // Transform stage-relative coordinates with local pan & zoom
        const clientX = cursor.x * zoom + panX
        const clientY = cursor.y * zoom + panY

        return (
          <div
            key={user.userId}
            style={{
              position: 'absolute',
              left: `${clientX}px`,
              top: `${clientY}px`,
              transform: 'translate(0, 0)',
              transition: 'left 80ms linear, top 80ms linear',
              pointerEvents: 'none'
            }}
            className="will-change-transform flex items-start gap-1 select-none"
          >
            {/* SVG Cursor Pointer */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: user.color }}
              className="drop-shadow-lg"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill="currentColor"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </svg>

            {/* Name Tag Badge */}
            <div
              style={{ backgroundColor: user.color }}
              className="px-2 py-0.5 rounded-full text-white text-[9px] font-black tracking-wider shadow-lg flex items-center gap-1 font-sans border border-white/20 whitespace-nowrap -mt-1"
            >
              <span>{user.name}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
