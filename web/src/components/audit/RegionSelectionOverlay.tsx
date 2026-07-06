'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useScreenshotStore } from '@/store/screenshotStore'

interface Props {
  onConfirm: (rect: { x: number; y: number; width: number; height: number }) => void
  onCancel: () => void
}

export function RegionSelectionOverlay({ onConfirm, onCancel }: Props) {
  const { screenshotMode } = useScreenshotStore()
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (screenshotMode !== 'region') return

    // Auto-focus the overlay so it receives keyboard focus immediately
    if (overlayRef.current) {
      overlayRef.current.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        if (startPos.x !== currentPos.x && startPos.y !== currentPos.y) {
          const x = Math.min(startPos.x, currentPos.x)
          const y = Math.min(startPos.y, currentPos.y)
          const width = Math.abs(currentPos.x - startPos.x)
          const height = Math.abs(currentPos.y - startPos.y)
          onConfirm({ x, y, width, height })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screenshotMode, startPos, currentPos, onCancel, onConfirm])

  if (screenshotMode !== 'region') {
    return null
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentPos({ x: e.clientX, y: e.clientY })
    if (overlayRef.current) {
      overlayRef.current.setPointerCapture(e.pointerId)
      overlayRef.current.focus()
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    if (overlayRef.current) {
      overlayRef.current.releasePointerCapture(e.pointerId)
    }
  }

  const rectX = Math.min(startPos.x, currentPos.x)
  const rectY = Math.min(startPos.y, currentPos.y)
  const rectW = Math.abs(currentPos.x - startPos.x)
  const rectH = Math.abs(currentPos.y - startPos.y)

  return (
    <div
      ref={overlayRef}
      tabIndex={0}
      className={`fixed inset-0 cursor-crosshair touch-none overflow-hidden outline-none ${isDragging ? 'z-[2147483647]' : 'z-[9998]'}`}
      style={{ backgroundColor: 'transparent' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full pointer-events-none flex items-center gap-4 z-50">
        <span>Drag to select area</span>
        <span className="text-gray-400">|</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 px-1 rounded border border-gray-600">Enter</kbd> to capture</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 px-1 rounded border border-gray-600">Esc</kbd> to cancel</span>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-black/30" />

      {(isDragging || (rectW > 0 && rectH > 0)) && (
        <div
          className="absolute border-2 border-purple-500 bg-purple-500/10 pointer-events-none"
          style={{
            left: rectX,
            top: rectY,
            width: rectW,
            height: rectH,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        />
      )}
    </div>
  )
}
