'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { CanvasFrame } from './CanvasFrame'
import { Plus, Minus, RotateCcw, AlertTriangle, Sparkles, Navigation } from 'lucide-react'

interface CanvasProps {
  projectId: string
}

export function Canvas({ projectId }: CanvasProps) {
  const { frames, flows, fetchCanvas, setSelectedFrame } = useCanvasStore()

  // State
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Refs for tracking pan drag without trigger re-render on every pixel
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (projectId) {
      fetchCanvas(projectId)
    }
  }, [projectId, fetchCanvas])

  // Mouse Down Panning Initialization
  const handleMouseDown = (e: React.MouseEvent) => {
    // Avoid pan if clicking a frame
    if ((e.target as HTMLElement).closest('.cursor-move')) return

    e.preventDefault()
    isPanningRef.current = true
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    }
    setSelectedFrame(null) // deselect current frame

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanningRef.current) return
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    isPanningRef.current = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  // Wheel Zoom Listener (Passive: false enabled via DOM hook)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      // Zoom Calculation centering the mouse point
      const zoomFactor = 1.1
      let nextZoom = zoom

      if (e.deltaY > 0) {
        nextZoom = zoom / zoomFactor
      } else {
        nextZoom = zoom * zoomFactor
      }

      // Clamp zoom between 0.3 and 2.5
      nextZoom = Math.max(0.3, Math.min(2.5, nextZoom))
      setZoom(nextZoom)
    };

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoom])

  const zoomIn = () => setZoom((z) => Math.min(2.5, z * 1.1))
  const zoomOut = () => setZoom((z) => Math.max(0.3, z / 1.1))
  const resetViewport = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`w-full h-full relative overflow-hidden bg-[#0a0a0f] select-none ${
        isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        // Radial dot grid background matching scaling
        backgroundImage: 'radial-gradient(circle, #ffffff08 1px, transparent 1px)',
        backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Transformation board */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Render child Frames */}
        <div className="relative pointer-events-auto">
          {frames.map((frame) => (
            <CanvasFrame key={frame.id} frame={frame} zoom={zoom} />
          ))}
        </div>
      </div>

      {/* Floating Canvas UI Controls overlay (bottom-right) */}
      <div className="absolute bottom-6 right-6 bg-[#111118]/80 backdrop-blur-2xl border border-white/5 p-1 rounded-2xl flex items-center gap-1.5 shadow-2xl z-20">
        <button
          onClick={zoomOut}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono font-bold text-white/40 px-2 min-w-[48px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        
        <div className="w-[1px] h-5 bg-white/5 mx-1" />

        <button
          onClick={resetViewport}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          title="Reset Viewport"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Flows Legend Panel overlay (top-left) */}
      {flows.length > 0 && (
        <div className="absolute top-6 left-6 bg-[#111118]/80 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 max-w-xs shadow-2xl z-20 space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-purple-400 rotate-45" />
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
              Active Flows sequence
            </span>
          </div>

          <div className="space-y-2">
            {flows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-white/80 truncate">
                  {flow.name}
                </span>
                <span className="bg-purple-500/10 text-purple-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border border-purple-500/10 flex-shrink-0">
                  {flow.frame_sequence.length} steps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Banner (if no frames are fetched) */}
      {frames.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-25">
          <AlertTriangle className="w-12 h-12 mb-3 text-white" />
          <h4 className="text-sm font-black uppercase tracking-widest">Observation Canvas Empty</h4>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1 text-white/60">No responsive snapshot frames mapped</p>
        </div>
      )}
    </div>
  )
}
export default Canvas
