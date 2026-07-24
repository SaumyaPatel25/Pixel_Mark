'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Plus, LayoutGrid, Sliders } from 'lucide-react'
import { useBlueprintStore } from '@/store/blueprintStore'
import { useBlueprintPresence } from '@/hooks/useBlueprintPresence'
import { BlueprintFrame } from './BlueprintFrame'
import { BlueprintRemoteCursors } from './BlueprintRemoteCursors'

interface BlueprintStageProps {
  projectId: string
}

export function BlueprintStage({ projectId }: BlueprintStageProps) {
  const {
    frames,
    zoom,
    setZoom,
    pan,
    setPan,
    activeTool,
    selectedFrameId,
    setSelectedFrameId,
    setSelectedNodeId,
    addFrame,
    isInspectorOpen,
    toggleInspector
  } = useBlueprintStore()

  const { sendCursorMove } = useBlueprintPresence(projectId, selectedFrameId || undefined)

  const [isDraggingPan, setIsDraggingPan] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const stageRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const zoomFactor = e.deltaY < 0 ? 0.05 : -0.05
        setZoom((z) => z + zoomFactor)
      } else {
        setPan((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY
        }))
      }
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [setZoom, setPan])

  const handlePointerDown = (e: React.PointerEvent) => {
    // Enable pan drag if move tool is selected or middle mouse button is pressed
    if (activeTool === 'move' || e.button === 1) {
      setIsDraggingPan(true)
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingPan) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      })
    }

    // Broadcast local cursor position in stage coordinates
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect()
      const stageX = (e.clientX - rect.left - pan.x) / (zoom || 1)
      const stageY = (e.clientY - rect.top - pan.y) / (zoom || 1)
      sendCursorMove(stageX, stageY)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingPan) {
      setIsDraggingPan(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_) {}
    }
  }

  const handleStageClick = (e: React.MouseEvent) => {
    // Only deselect if clicked directly on blank canvas background
    if (e.target === e.currentTarget) {
      setSelectedFrameId(null)
      setSelectedNodeId(null)
    }
  }

  return (
    <main
      ref={stageRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleStageClick}
      className={`flex-1 relative overflow-hidden bg-[#070a12] select-none ${
        activeTool === 'move' || isDraggingPan ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
    >
      {/* STAGE Remote User Cursors Overlay */}
      <BlueprintRemoteCursors panX={pan.x} panY={pan.y} zoom={zoom} />

      {/* Zoomable & Pannable Stage Container */}
      <div
        className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out pointer-events-auto"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`
        }}
      >
        {frames.length === 0 ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-center bg-[#0d1322]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Artboards on Canvas</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Create a new frame artboard to start structuring your website design.
              </p>
            </div>
            <button
              onClick={() => addFrame('Main Surface')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Frame</span>
            </button>
          </div>
        ) : (
          frames.map((frame) => <BlueprintFrame key={frame.id} frame={frame} />)
        )}
      </div>

      {/* Floating Button to Reopen Inspector when Closed */}
      {!isInspectorOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleInspector()
          }}
          className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1322]/90 border border-cyan-500/30 text-cyan-400 hover:text-white hover:bg-slate-800 shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer text-xs font-semibold"
          title="Reopen Inspector Menu"
        >
          <Sliders className="w-4 h-4" />
          <span>Inspector</span>
        </button>
      )}
    </main>
  )
}
