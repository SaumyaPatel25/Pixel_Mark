'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCanvasStore } from '@/store/canvasStore'
import { CanvasFrame } from './CanvasFrame'
import { api } from '@/lib/api'
import {
  Plus,
  Minus,
  RotateCcw,
  AlertTriangle,
  Navigation,
  ArrowLeft,
  Monitor,
  Share2,
  Trash2,
  CheckCircle,
  HelpCircle
} from 'lucide-react'

interface CanvasProps {
  projectId: string
}

export function Canvas({ projectId }: CanvasProps) {
  const router = useRouter()
  const {
    frames,
    flows,
    isLoading,
    error,
    zoom,
    panX,
    panY,
    selectedFrameId,
    fetchCanvas,
    setSelectedFrame,
    setZoom,
    setPan,
    createFlow,
    deleteFlow,
    deleteFrame
  } = useCanvasStore()

  // Local UI States
  const [projectName, setProjectName] = useState('Project')
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Refs for tracking pan drag without re-triggering render on every pixel
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Load Canvas + Project Name
  useEffect(() => {
    if (projectId) {
      fetchCanvas(projectId)
      api.projects.get(projectId)
        .then(p => setProjectName(p.name))
        .catch(() => {})
    }
  }, [projectId, fetchCanvas])

  // Spacebar panning listener
  const [spacePressed, setSpacePressed] = useState(false)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setSpacePressed(true)
      }
      if (e.key === 'Escape') {
        setSelectedFrame(null)
        setConnectMode(false)
        setConnectSourceId(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFrameId) {
        if (confirm('Are you sure you want to delete this frame? This will not delete the underlying session.')) {
          deleteFrame(selectedFrameId).then(() => {
            showToast('Frame deleted')
          })
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedFrameId, deleteFrame, setSelectedFrame, showToast])

  // Mouse Down Panning Initialization
  const handleMouseDown = (e: React.MouseEvent) => {
    // Avoid pan if clicking a frame
    if ((e.target as HTMLElement).closest('.cursor-move') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return

    e.preventDefault()
    isPanningRef.current = true
    panStartRef.current = {
      x: e.clientX - panX,
      y: e.clientY - panY,
    }
    setSelectedFrame(null) // deselect current frame

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanningRef.current) return
    setPan(
      e.clientX - panStartRef.current.x,
      e.clientY - panStartRef.current.y
    )
  }, [setPan])

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  // Wheel Zoom Listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = 1.08
      let nextZoom = zoom

      if (e.deltaY > 0) {
        nextZoom = zoom / zoomFactor
      } else {
        nextZoom = zoom * zoomFactor
      }

      setZoom(nextZoom)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoom, setZoom])

  const zoomIn = () => setZoom(zoom * 1.1)
  const zoomOut = () => setZoom(zoom / 1.1)
  const resetViewport = () => {
    setZoom(1.0)
    setPan(0, 0)
  }

  // Handle frame selection / connection flow
  const handleFrameSelect = (frameId: string) => {
    if (connectMode) {
      if (!connectSourceId) {
        setConnectSourceId(frameId)
        showToast('Source frame set. Now click target frame.', 'success')
      } else {
        if (connectSourceId === frameId) {
          setConnectSourceId(null)
          setConnectMode(false)
          showToast('Connection cancelled.', 'error')
        } else {
          // Create flow connection
          createFlow({
            project_id: projectId,
            source_frame_id: connectSourceId,
            target_frame_id: frameId,
            label: ''
          }).then((res) => {
            if (res) {
              showToast('Flow created successfully!')
            } else {
              showToast('Failed to create flow.', 'error')
            }
          })
          setConnectSourceId(null)
          setConnectMode(false)
        }
      }
    } else {
      setSelectedFrame(frameId)
    }
  }

  // Add Session from Canvas
  const handleAddSession = async () => {
    const title = prompt('Enter a title for the new review session:')
    if (!title || !title.trim()) return

    try {
      await api.sessions.createSession({
        project_id: projectId,
        title: title.trim()
      })
      showToast('Session created and synced to canvas!')
      fetchCanvas(projectId)
    } catch (err: any) {
      showToast(err.message || 'Failed to create session', 'error')
    }
  }

  if (isLoading && frames.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f] text-white">
        <span className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-widest uppercase text-white/40">Loading blueprint canvas...</span>
      </div>
    )
  }

  if (frames.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-white p-6">
        <div className="max-w-md w-full bg-[#111118] border border-white/5 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Monitor className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">No Sessions Found</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Create your first review session to start mapping the audit substrate and visualize the user journey.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleAddSession}
              className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Add First Session
            </button>
            <Link
              href={`/project/${projectId}`}
              className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center"
            >
              Go to Project Details
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#0d0d14] relative text-white select-none">
      {/* Top controls toolbar */}
      <div className="h-14 bg-[#0d0d14] border-b border-white/5 flex items-center justify-between px-6 z-30 select-none flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/project/${projectId}`}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-all font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          
          <div className="h-4 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Dashboard</span>
            <span className="text-white/20">/</span>
            <span className="text-xs text-white/60 font-bold max-w-[120px] truncate">{projectName}</span>
            <span className="text-white/20">/</span>
            <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Canvas</span>
          </div>
        </div>

        {/* Toolbar Center / Right Buttons */}
        <div className="flex items-center gap-3">
          {/* Connect Frames Toggle */}
          <button
            onClick={() => {
              setConnectMode(!connectMode)
              setConnectSourceId(null)
            }}
            className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
              connectMode
                ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-950/30'
                : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {connectMode ? 'Connecting Mode Active' : 'Connect Frames'}
          </button>

          <button
            onClick={handleAddSession}
            className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-teal-500/20"
          >
            Add Session
          </button>
        </div>
      </div>

      {/* Main Pan/Zoom viewport container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 relative overflow-hidden bg-[#171614] select-none ${
          isPanningRef.current ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'
        }`}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1.5px, transparent 1.5px)',
          backgroundSize: `${36 * zoom}px ${36 * zoom}px`,
          backgroundPosition: `${panX}px ${panY}px`,
        }}
      >
        {/* Transform Group */}
        <div
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Flows SVG Overlay Behind Cards */}
          <svg className="absolute inset-0 pointer-events-auto overflow-visible z-0" style={{ pointerEvents: 'none' }}>
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f98a3" />
              </marker>
            </defs>

            {flows.map((flow) => {
              const src = frames.find((f) => f.id === flow.source_frame_id)
              const dest = frames.find((f) => f.id === flow.target_frame_id)
              if (!src || !dest) return null

              const sW = src.width || 320
              const sH = src.height || 200
              const dW = dest.width || 320
              const dH = dest.height || 200

              const startX = src.position_x + sW
              const startY = src.position_y + sH / 2
              const endX = dest.position_x
              const endY = dest.position_y + dH / 2

              const dx = Math.abs(endX - startX) * 0.5
              const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`

              const midX = (startX + endX) / 2
              const midY = (startY + endY) / 2

              return (
                <g key={flow.id} className="pointer-events-auto">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#4f98a3"
                    strokeWidth="2.5"
                    strokeOpacity="0.5"
                    markerEnd="url(#arrow)"
                    className="hover:stroke-teal-300 hover:stroke-[3.5] hover:stroke-opacity-80 transition-all cursor-pointer"
                  />
                  {/* Small flow delete button */}
                  <foreignObject
                    x={midX - 10}
                    y={midY - 10}
                    width="20"
                    height="20"
                    className="overflow-visible"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this flow connection?')) {
                          deleteFlow(flow.id).then(() => {
                            showToast('Flow deleted')
                          })
                        }
                      }}
                      title="Delete connection flow"
                      className="w-5 h-5 rounded-full bg-red-950/80 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center text-[10px] font-bold shadow-lg transition-all"
                    >
                      ×
                    </button>
                  </foreignObject>
                </g>
              )
            })}
          </svg>

          {/* Canvas Cards Layer */}
          <div className="relative pointer-events-auto z-10">
            {frames.map((frame) => {
              const isSource = connectSourceId === frame.id
              return (
                <CanvasFrame
                  key={frame.id}
                  frame={frame}
                  zoom={zoom}
                  onSelect={() => handleFrameSelect(frame.id)}
                  isSource={isSource}
                />
              )
            })}
          </div>
        </div>

        {/* Zoom Level Indicator overlay (bottom-right) */}
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

        {/* Keyboard hints overlay (bottom-left) */}
        <div className="absolute bottom-6 left-6 bg-[#111118]/80 backdrop-blur-2xl border border-white/5 px-4 py-2 rounded-xl flex items-center gap-4 text-[10px] font-mono tracking-widest text-white/40 uppercase shadow-xl z-20 select-none pointer-events-none">
          <span>Scroll to zoom</span>
          <span>•</span>
          <span>Drag to pan</span>
          <span>•</span>
          <span>Double-click to open</span>
        </div>

        {/* Connecting mode notice */}
        {connectMode && (
          <div className="absolute top-6 left-6 bg-teal-950/80 border border-teal-500/30 text-teal-300 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl z-20 text-[11px] font-bold tracking-wide animate-pulse">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>
              {connectSourceId
                ? 'Click target frame to establish flow'
                : 'Click source frame for connection'}
            </span>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-2xl border transition-all z-50 flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'bg-teal-950 border-teal-500 text-teal-300'
              : 'bg-red-950 border-red-500 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
export default Canvas
