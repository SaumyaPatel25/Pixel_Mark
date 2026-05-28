'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, ArrowLeft, ShieldAlert, Monitor, HelpCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AuditSurfaceProps {
  sessionId: string
  projectId: string
  onMarkerCreated?: (marker: any) => void
  onPageChanged?: (url: string, title: string) => void
}

export function AuditSurface({
  sessionId,
  projectId,
  onMarkerCreated,
  onPageChanged
}: AuditSurfaceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const [rendererType, setRendererType] = useState('dom')
  const [pageHistory, setPageHistory] = useState<{ url: string; title: string; rendererType: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showHint, setShowHint] = useState(true)

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')
  const proxyUrl = `${API_BASE}/proxy/session/${sessionId}`

  // Fade out Ctrl+Click hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Listen for agent's postMessage events
  useEffect(() => {
    const handleAgentMessage = async (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      switch (data.type) {
        case 'PIXELMARK_PAGE_LOAD':
          setCurrentUrl(data.url)
          setCurrentTitle(data.title || '')
          setRendererType(data.rendererType || 'dom')
          setIsLoading(false)
          
          setPageHistory(prev => {
            // Avoid duplicate pushes for reloads
            if (prev.length > 0 && prev[prev.length - 1].url === data.url) return prev
            return [...prev, { url: data.url, title: data.title || '', rendererType: data.rendererType || 'dom' }]
          })
          
          if (onPageChanged) {
            onPageChanged(data.url, data.title || '')
          }
          break

        case 'PIXELMARK_PAGE_UNLOAD':
          setIsLoading(true)
          break

        case 'PIXELMARK_CREATE_MARKER':
          try {
            // 1. Save marker
            const markerPayload = {
              session_id: sessionId,
              project_id: projectId,
              title: data.inner_text ? `Marker: ${data.inner_text.slice(0, 20)}` : 'Marker on Element',
              description: data.inner_text || '',
              url: data.pageUrl,
              page_url: data.pageUrl,
              page_title: data.pageTitle,
              renderer_type: data.rendererType,
              canvas_context: data.canvas_context || null,
              xpath: data.xpath || null,
              css_selector: data.css_selector || null,
              inner_text: data.inner_text || null,
              viewport: data.viewport,
              browser: parseBrowser(data.user_agent),
              os: parseOS(data.user_agent),
              scroll_position: data.scroll_position,
              console_errors: data.console_errors,
              network_errors: data.network_errors,
              screenshot_url: null,
              priority: 'medium'
            }

            const createdMarker = await api.markers.createMarker(markerPayload)

            // 2. If base64 screenshot data is present, convert and upload
            if (data.screenshot_data_url) {
              try {
                const response = await fetch(data.screenshot_data_url)
                const blob = await response.blob()
                const updated = await api.markers.uploadScreenshot(createdMarker.id, blob)
                if (onMarkerCreated) {
                  onMarkerCreated(updated)
                }
              } catch (scrErr) {
                console.warn('Failed to upload element crop screenshot:', scrErr)
                if (onMarkerCreated) {
                  onMarkerCreated(createdMarker)
                }
              }
            } else {
              if (onMarkerCreated) {
                onMarkerCreated(createdMarker)
              }
            }
          } catch (err) {
            console.error('[AuditSurface] Save failed:', err)
          }
          break

        case 'EXIT_AUDIT':
          window.location.href = '/dashboard'
          break
      }
    }

    window.addEventListener('message', handleAgentMessage)
    return () => window.removeEventListener('message', handleAgentMessage)
  }, [sessionId, projectId, onMarkerCreated, onPageChanged])

  const handleGoBack = () => {
    if (pageHistory.length <= 1) return
    setIsLoading(true)
    const newHistory = [...pageHistory]
    newHistory.pop() // Remove current
    const prevPage = newHistory[newHistory.length - 1]
    setPageHistory(newHistory)
    
    // Set iframe source back to previous URL
    if (iframeRef.current) {
      iframeRef.current.src = `${API_BASE}/proxy/session/${sessionId}/page?url=${encodeURIComponent(prevPage.url)}`
    }
  }

  // Extractor helpers
  function parseBrowser(ua: string): string {
    if (!ua) return 'Unknown'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Other'
  }

  function parseOS(ua: string): string {
    if (!ua) return 'Unknown'
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
    return 'Other'
  }

  return (
    <div className="w-full h-full flex flex-col bg-black relative select-none">
      {/* Page Breadcrumb Topbar */}
      <div className="bg-[#0d0d14] border-b border-white/5 text-white/60 text-xs px-4 h-9 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            disabled={pageHistory.length <= 1}
            className={cn(
              "p-1 rounded-md transition-all flex items-center justify-center",
              pageHistory.length > 1 
                ? "text-white/80 hover:bg-white/5 hover:text-white" 
                : "text-white/20 cursor-not-allowed"
            )}
            title="Navigate Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          
          <div className="h-4 w-[1px] bg-white/5" />
          
          <div className="flex items-center gap-2 max-w-lg truncate" title={currentUrl}>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Location:</span>
            <span className="text-[11px] font-mono text-white/70 select-text truncate">
              {currentUrl || 'Initiating substrate connection...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Renderer Type Badge */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 select-none">
            <Monitor className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
              {rendererType === 'threejs' ? 'Three.js' : rendererType === 'webgl' ? 'WebGL' : rendererType === 'canvas2d' ? 'Canvas2D' : 'DOM'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/5" />

          {/* Visits Count */}
          <span className="text-[10px] font-bold font-mono text-white/30 uppercase">
            {pageHistory.length} {pageHistory.length === 1 ? 'Page' : 'Pages'} Visited
          </span>
        </div>
      </div>

      {/* Main Substrate Viewport Frame */}
      <div className="flex-1 relative bg-white">
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="clipboard-read; clipboard-write"
          className="w-full h-full border-0 bg-white"
          onLoad={() => setIsLoading(false)}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-md flex flex-col items-center justify-center z-40 transition-all select-none">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Synchronizing Substrate Sub-Page</p>
          </div>
        )}

        {/* Subtle Ctrl+Click Hint */}
        {showHint && (
          <div className="absolute bottom-4 left-4 bg-purple-900/90 border border-purple-500/20 text-white px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 z-30 transition-all animate-bounce select-none">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-wider">Hold Ctrl + Click elements or 3D meshes to drop markers</span>
          </div>
        )}
      </div>
    </div>
  )
}
