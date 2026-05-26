'use client'

import React, { useRef } from 'react'
import { CanvasFrame as ICanvasFrame, useCanvasStore } from '@/store/canvasStore'
import { FileImage, Activity } from 'lucide-react'

interface CanvasFrameProps {
  frame: ICanvasFrame
  zoom: number
}

export function CanvasFrame({ frame, zoom }: CanvasFrameProps) {
  const { updateFramePosition, persistFramePosition, selectedFrame, setSelectedFrame } = useCanvasStore()
  
  const frameRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, frameX: 0, frameY: 0 })

  const isSelected = selectedFrame === frame.id

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag trigger if clicking form controls inside frame (if any)
    if ((e.target as HTMLElement).closest('button, select, input, a')) return

    e.stopPropagation()
    e.preventDefault()

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      frameX: frame.position_x,
      frameY: frame.position_y,
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - dragStartRef.current.x) / zoom
    const dy = (e.clientY - dragStartRef.current.y) / zoom

    const newX = Math.round(dragStartRef.current.frameX + dx)
    const newY = Math.round(dragStartRef.current.frameY + dy)

    updateFramePosition(frame.id, newX, newY)
  }

  const handleMouseUp = (e: MouseEvent) => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    const dx = (e.clientX - dragStartRef.current.x) / zoom
    const dy = (e.clientY - dragStartRef.current.y) / zoom

    const finalX = Math.round(dragStartRef.current.frameX + dx)
    const finalY = Math.round(dragStartRef.current.frameY + dy)

    // Save back to API
    persistFramePosition(frame.id, finalX, finalY)
  }

  const handleFrameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFrame(frame.id)
  }

  return (
    <div
      ref={frameRef}
      onMouseDown={handleMouseDown}
      onClick={handleFrameClick}
      style={{
        transform: `translate(${frame.position_x}px, ${frame.position_y}px)`,
        width: `${frame.width || 320}px`,
        height: `${frame.height || 220}px`,
      }}
      className={`absolute select-none bg-[#0c0c10] border rounded-2xl flex flex-col shadow-2xl transition-shadow cursor-move z-10 ${
        isSelected
          ? 'border-purple-500 shadow-[0_0_24px_rgba(124,58,237,0.35)]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Frame Header Bar */}
      <div className="bg-[#111118] px-4 py-3 rounded-t-2xl border-b border-white/5 flex items-center justify-between gap-4">
        <span className="text-xs font-black text-white/80 uppercase tracking-wider truncate">
          {frame.title || 'UAT Observation Viewport'}
        </span>
        {frame.markers && frame.markers.length > 0 && (
          <span className="bg-purple-600/20 text-purple-400 border border-purple-500/20 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase leading-none">
            {frame.markers.length} Indicators
          </span>
        )}
      </div>

      {/* Snapshot / Preview Area */}
      <div className="flex-1 bg-[#09090d] rounded-b-2xl relative overflow-hidden flex flex-col items-center justify-center p-4">
        {frame.snapshot_url ? (
          <img
            src={frame.snapshot_url}
            alt="Observation snapshot view"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40 hover:opacity-60 transition-opacity"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 opacity-15">
            <FileImage className="w-10 h-10 text-white" />
            <span className="text-[9px] font-black tracking-widest uppercase">No Viewport Snapshot</span>
          </div>
        )}

        {/* Floating Marker Dots Indicators */}
        {frame.markers && frame.markers.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 flex-wrap">
            {frame.markers.slice(0, 8).map((m: any, idx: number) => {
              let dotBg = 'bg-gray-500'
              if (m.priority === 'critical') dotBg = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              else if (m.priority === 'high') dotBg = 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
              else if (m.priority === 'medium') dotBg = 'bg-yellow-500'
              
              return (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full border border-black/40 ${dotBg}`}
                  title={`${m.priority || 'low'} priority marker`}
                />
              )
            })}
            {frame.markers.length > 8 && (
              <span className="text-[8px] font-bold text-white/30 font-mono ml-0.5">
                +{frame.markers.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default CanvasFrame
