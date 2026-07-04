'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Pencil, Monitor, Smartphone, Tablet, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProxyIframeProps {
  src: string
  onLoad: () => void
  iframeRef: React.RefObject<HTMLIFrameElement | null>
}

const ProxyIframe = React.memo(function ProxyIframe({ src, onLoad, iframeRef }: ProxyIframeProps) {
  return (
    <iframe
      ref={iframeRef}
      src={src}
      onLoad={onLoad}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      allow="accelerometer; autoplay; clipboard-read; clipboard-write"
      className="w-full h-full border-none bg-white"
      title="Link Viewer"
    />
  )
})

interface LinkViewerPanelProps {
  initialUrl: string
  sessionId: string
  onClose: () => void
  onToggleStyleEdits: () => void
  editsCount: number
}

export function LinkViewerPanel({
  initialUrl,
  sessionId,
  onClose,
  onToggleStyleEdits,
  editsCount
}: LinkViewerPanelProps) {
  const [url, setUrl] = useState(initialUrl)
  const [inputUrl, setInputUrl] = useState(initialUrl)
  const [domEditMode, setDomEditMode] = useState(false)
  const [agentReady, setAgentReady] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ w: 1280, h: 800 })
  
  // Center initially
  useEffect(() => {
    setPosition({
      x: Math.max(0, (window.innerWidth - 1280) / 2),
      y: Math.max(0, (window.innerHeight - 800) / 2)
    })
  }, [])

  // Dragging logic
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on header, but not on interactive elements inside header
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return
    isDragging.current = true
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    setPosition({
      x: dragStart.current.posX + (e.clientX - dragStart.current.x),
      y: dragStart.current.posY + (e.clientY - dragStart.current.y)
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Handle URL change
  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault()
    let finalUrl = inputUrl
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    if (finalUrl !== url) {
      setIframeLoading(true)
      setUrl(finalUrl)
      setInputUrl(finalUrl)
      setDomEditMode(false) // reset mode on navigation
    }
  }

  // Handle Agent ready ping and ACKs
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PIXELMARK_AGENT_READY') {
        setAgentReady(true)
        if (domEditMode) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'PIXELMARK_ACTIVATE_DOM_EDIT' }, '*'
          )
        }
      }
      if (e.data?.type === 'PIXELMARK_AGENT_ACK') {
        console.log('[PixelMark Parent] Agent acknowledged:', e.data.action)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [domEditMode])

  // On iframe reload, reset ready state
  const handleIframeLoad = () => {
    setAgentReady(false)
    setIframeLoading(false)
  }

  // Set loading true when URL changes
  useEffect(() => {
    setIframeLoading(true)
  }, [url])

  // Toggle DOM Edit Mode
  const toggleDomEdit = () => {
    const next = !domEditMode
    setDomEditMode(next)
    if (next && agentReady) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'PIXELMARK_ACTIVATE_DOM_EDIT' }, '*'
      )
    } else if (!next) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'PIXELMARK_DEACTIVATE_DOM_EDIT' }, '*'
      )
    }
  }

  const proxyUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/proxy/session/${sessionId}/page?url=${encodeURIComponent(url)}`

  if (!sessionId) {
    return <div className="flex-1 flex items-center justify-center text-white/40 text-sm bg-[#1a1a24]">Loading session...</div>
  }

  return (
    <div
      ref={panelRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: size.w,
        height: size.h
      }}
      className="absolute top-0 left-0 bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-40 pointer-events-auto"
    >
      {/* Header */}
      <div 
        className="h-14 bg-[#111116] border-b border-white/10 flex items-center justify-between px-4 cursor-move select-none flex-shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Left side: Device & URL */}
        <div className="flex items-center gap-4 flex-1">
          {/* Device Toggles */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setDevice('mobile')}
              className={cn("p-1.5 rounded-lg transition-colors", device === 'mobile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white')}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={cn("p-1.5 rounded-lg transition-colors", device === 'tablet' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white')}
              title="Tablet"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={cn("p-1.5 rounded-lg transition-colors", device === 'desktop' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white')}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitUrl} className="flex-1 max-w-[400px]">
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono text-white/80 focus:outline-none focus:border-teal-500/50"
              placeholder="https://example.com"
            />
          </form>
        </div>

        {/* Center/Right: Tools */}
        <div className="flex items-center justify-end gap-3 flex-1">
          {/* Style Edits Badge */}
          <button
            onClick={onToggleStyleEdits}
            className="h-8 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-wider transition-colors border border-teal-500/20 flex items-center gap-2"
          >
            Style Edits
            <span className="w-5 h-5 rounded-md bg-teal-500/20 flex items-center justify-center text-teal-300">
              {editsCount}
            </span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 mx-2" />

          {/* DOM Edit Toggle */}
          <button
            onClick={toggleDomEdit}
            className={cn(
              "h-8 rounded-xl font-extrabold text-[10px] uppercase tracking-widest px-4 flex items-center gap-1.5 transition-all border",
              domEditMode
                ? "bg-[#01696f] border-teal-500 text-white shadow-lg shadow-teal-900/40"
                : "bg-white/5 hover:bg-white/10 border-white/5 text-white"
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
            DOM Edit
          </button>

          {/* Whiteboard Toggle (Future) */}
          <button disabled className="h-8 rounded-xl font-extrabold text-[10px] uppercase tracking-widest px-4 flex items-center gap-1.5 transition-all border bg-white/5 border-white/5 text-white/30 cursor-not-allowed">
            Whiteboard
          </button>
          
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Iframe */}
      <div className="flex-1 bg-[#1a1a24] relative overflow-hidden flex justify-center border-t border-white/5">
        {domEditMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#01696f]/90 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-xl shadow-lg border border-teal-500/30 backdrop-blur-md">
            Shift+Click any element to restyle it
          </div>
        )}
        {iframeLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d14] text-white z-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-3" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">Loading proxied substrate...</span>
          </div>
        )}
        <div className={cn(
          "h-full transition-all duration-300 relative",
          device === 'mobile' ? 'w-[375px] border-x border-white/10 shadow-2xl' :
          device === 'tablet' ? 'w-[768px] border-x border-white/10 shadow-2xl' :
          'w-full'
        )}>
          <ProxyIframe
            iframeRef={iframeRef}
            src={proxyUrl}
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
      
      {/* Resizer */}
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-center justify-center"
        onPointerDown={(e) => {
          e.stopPropagation()
          const startX = e.clientX
          const startY = e.clientY
          const startW = size.w
          const startH = size.h
          
          const onMove = (moveEvent: PointerEvent) => {
            setSize({
              w: Math.max(400, startW + (moveEvent.clientX - startX)),
              h: Math.max(300, startH + (moveEvent.clientY - startY))
            })
          }
          const onUp = () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
          }
          window.addEventListener('pointermove', onMove)
          window.addEventListener('pointerup', onUp)
        }}
      >
        <div className="w-2 h-2 border-b-2 border-r-2 border-white/20 mr-1 mb-1" />
      </div>
    </div>
  )
}
