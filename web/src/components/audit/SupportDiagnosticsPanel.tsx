import React, { useState, useEffect } from 'react'
import { Terminal, Shield, Cpu, RefreshCw, X, AlertTriangle } from 'lucide-react'

interface SupportDiagnosticsPanelProps {
  sessionId: string
  projectId: string
  rendererType: string
  heavyMode: boolean
  currentUrl: string
  failedAssetsCount: number
  lastMarkerStatus: {
    status: 'idle' | 'success' | 'error' | 'submitting'
    message: string
    timestamp?: string
  }
}

export function SupportDiagnosticsPanel({
  sessionId,
  projectId,
  rendererType,
  heavyMode,
  currentUrl,
  failedAssetsCount,
  lastMarkerStatus
}: SupportDiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetOrigin, setTargetOrigin] = useState('N/A')

  // Resolve target origin dynamically from current URL
  useEffect(() => {
    if (currentUrl) {
      try {
        // Resolve proxy parameters
        const urlObj = new URL(currentUrl)
        if (urlObj.pathname.includes('/proxy/session/')) {
          const urlParam = urlObj.searchParams.get('url')
          if (urlParam) {
            setTargetOrigin(new URL(urlParam).origin)
          } else {
            setTargetOrigin(urlObj.origin)
          }
        } else {
          setTargetOrigin(urlObj.origin)
        }
      } catch (e) {
        setTargetOrigin('N/A')
      }
    }
  }, [currentUrl])

  // Ctrl+Shift+D keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <div 
      className="fixed bottom-4 right-4 z-[99999] w-80 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-md transition-all font-sans"
      role="dialog"
      aria-label="Support Diagnostics Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Terminal className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">PixelMark Diagnostics</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-white/40 hover:text-white transition-colors"
          aria-label="Close Diagnostics Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="space-y-3.5 text-[11px] font-mono select-all">
        {/* Render Type */}
        <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2 rounded-xl">
          <div className="flex items-center gap-1 text-white/50">
            <Cpu className="w-3.5 h-3.5" />
            <span>Renderer</span>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {rendererType}
          </span>
        </div>

        {/* Heavy Mode Status */}
        <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2 rounded-xl">
          <div className="flex items-center gap-1 text-white/50">
            <Shield className="w-3.5 h-3.5" />
            <span>Heavy Mode</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${heavyMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
            {heavyMode ? 'ACTIVE' : 'OFF'}
          </span>
        </div>

        {/* Details List */}
        <div className="space-y-2 border-t border-white/5 pt-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Target Origin</span>
            <span className="text-white/80 truncate text-[10px]" title={targetOrigin}>{targetOrigin}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Session ID</span>
            <span className="text-white/80 select-all truncate text-[10px]">{sessionId}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Project ID</span>
            <span className="text-white/80 truncate text-[10px]">{projectId}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Proxy Health</span>
            {failedAssetsCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                {failedAssetsCount} assets failed to load
              </span>
            ) : (
              <span className="text-green-400 text-[10px]">Healthy (0 proxy errors)</span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Last Feedback Pin Payload</span>
            <div className="bg-black/20 p-2 rounded-lg border border-white/5">
              <div className="flex justify-between items-center text-[9px] mb-1">
                <span className="text-white/40">Status:</span>
                <span className={`font-bold uppercase ${
                  lastMarkerStatus.status === 'success' ? 'text-green-400' :
                  lastMarkerStatus.status === 'error' ? 'text-red-400' :
                  lastMarkerStatus.status === 'submitting' ? 'text-cyan-400' : 'text-white/40'
                }`}>{lastMarkerStatus.status}</span>
              </div>
              <p className="text-[9px] text-white/60 leading-normal line-clamp-2" title={lastMarkerStatus.message}>
                {lastMarkerStatus.message || 'No feedback pins placed in this review session.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
