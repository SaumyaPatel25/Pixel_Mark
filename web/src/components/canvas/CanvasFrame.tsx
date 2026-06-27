'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasFrame as ICanvasFrame, useCanvasStore } from '@/store/canvasStore'
import { FileImage, Activity } from 'lucide-react'

interface CanvasFrameProps {
  frame: ICanvasFrame
  zoom: number
  onSelect: () => void
  isSource?: boolean
}

export function CanvasFrame({ frame, zoom, onSelect, isSource = false }: CanvasFrameProps) {
  const router = useRouter()
  const { updateFramePosition, selectedFrameId } = useCanvasStore()
  
  const frameRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, frameX: 0, frameY: 0, hasMoved: false })

  const isSelected = selectedFrameId === frame.id

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag trigger if clicking links or button controls inside frame
    if ((e.target as HTMLElement).closest('button, select, input, a')) return

    e.stopPropagation()
    e.preventDefault()

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      frameX: frame.position_x,
      frameY: frame.position_y,
      hasMoved: false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - dragStartRef.current.x) / zoom
    const dy = (e.clientY - dragStartRef.current.y) / zoom

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true
    }

    const newX = Math.round(dragStartRef.current.frameX + dx)
    const newY = Math.round(dragStartRef.current.frameY + dy)

    updateFramePosition(frame.id, newX, newY)
  }

  const handleMouseUp = (e: MouseEvent) => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    // Only select if it was a simple click and not a drag
    if (!dragStartRef.current.hasMoved) {
      onSelect()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (frame.session_id) {
      router.push(`/sessions/${frame.session_id}`)
    }
  }

  // Priority Distribution Bar Calculation
  const dist = frame.priority_distribution || { critical: 0, high: 0, medium: 0, low: 0 }
  const totalMarkers = dist.critical + dist.high + dist.medium + dist.low
  const getPct = (val: number) => totalMarkers > 0 ? `${(val / totalMarkers) * 100}%` : '0%'

  // Date formatting
  const formattedDate = frame.created_at
    ? new Date(frame.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Unknown Date'

  return (
    <div
      ref={frameRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        transform: `translate(${frame.position_x}px, ${frame.position_y}px)`,
        width: `${frame.width || 320}px`,
        height: `${frame.height || 220}px`,
      }}
      className={`absolute select-none bg-[#1c1b19] border rounded-xl flex flex-col shadow-2xl transition-all cursor-move z-10 ${
        isSource
          ? 'border-dashed border-teal-400 ring-2 ring-teal-400 animate-pulse shadow-[0_0_16px_rgba(20,184,166,0.2)]'
          : isSelected
          ? 'border-[#4f98a3] ring-1 ring-[#4f98a3] shadow-[0_0_24px_rgba(79,152,163,0.3)]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Frame Accent Color Indicator top border strip */}
      <div 
        className="h-1.5 w-full rounded-t-xl" 
        style={{ backgroundColor: frame.color || '#1c1b19' }} 
      />

      {/* Frame Header Bar */}
      <div className="bg-[#1c1b19] px-4 py-3 border-b border-white/5 flex items-center justify-between gap-4">
        <span className="text-xs font-black text-white/80 uppercase tracking-wider truncate">
          {frame.title || 'Untitled Session'}
        </span>
        {frame.marker_count !== undefined && frame.marker_count > 0 && (
          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase leading-none">
            {frame.marker_count} Indicators
          </span>
        )}
      </div>

      {/* Body Area showing top 3 marker titles or empty */}
      <div className="flex-1 bg-[#151413] relative overflow-hidden flex flex-col justify-between p-4 min-h-0">
        <div className="space-y-2">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-wider block">Top Indicators</span>
          
          {frame.top_markers && frame.top_markers.length > 0 ? (
            <div className="space-y-1.5 max-h-[85px] overflow-hidden">
              {frame.top_markers.slice(0, 3).map((m: any, idx: number) => {
                let badgeColor = 'text-gray-400 border-gray-500/20 bg-gray-500/5'
                if (m.priority === 'critical') badgeColor = 'text-red-400 border-red-500/20 bg-red-500/5'
                else if (m.priority === 'high') badgeColor = 'text-orange-400 border-orange-500/20 bg-orange-500/5'
                else if (m.priority === 'medium') badgeColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                
                return (
                  <div key={idx} className="flex items-center gap-2 text-[10px] leading-tight">
                    <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                      {m.priority}
                    </span>
                    <span className="text-white/60 truncate font-semibold">
                      {m.title}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-2 text-[10px] text-white/20 italic font-medium">
              No markers yet
            </div>
          )}
        </div>

        {/* Bottom Area - Priority distribution bar & date */}
        <div className="space-y-2 pt-2 border-t border-white/[0.03] mt-auto">
          {totalMarkers > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] font-mono text-white/30 uppercase tracking-wider">
                <span>Priority Mix</span>
                <span>{totalMarkers} Total</span>
              </div>
              
              {/* Stacked Proportional Distribution Bar */}
              <div className="h-1.5 w-full rounded-full bg-white/5 flex overflow-hidden">
                {dist.critical > 0 && (
                  <div 
                    className="h-full bg-red-500" 
                    style={{ width: getPct(dist.critical) }} 
                    title={`Critical: ${dist.critical}`} 
                  />
                )}
                {dist.high > 0 && (
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: getPct(dist.high) }} 
                    title={`High: ${dist.high}`} 
                  />
                )}
                {dist.medium > 0 && (
                  <div 
                    className="h-full bg-yellow-500" 
                    style={{ width: getPct(dist.medium) }} 
                    title={`Medium: ${dist.medium}`} 
                  />
                )}
                {dist.low > 0 && (
                  <div 
                    className="h-full bg-teal-600" 
                    style={{ width: getPct(dist.low) }} 
                    title={`Low: ${dist.low}`} 
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-white/30 uppercase pt-0.5">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-white/20" />
              UAT Substrate
            </span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default CanvasFrame
