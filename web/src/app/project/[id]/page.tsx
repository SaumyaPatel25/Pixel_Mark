'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Share2, PanelRightClose, PanelRightOpen, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExportPanel } from '@/components/ExportPanel'
import { DesignSystemPanel } from '@/components/DesignSystemPanel'
import { ShareLinkPanel } from '@/components/share/ShareLinkPanel'
import { ShareLinkButton } from '@/components/share/ShareLinkButton'
import CommandCenter from '@/components/CommandCenter'
import { Palette } from 'lucide-react'
import { AuditSurface } from '@/components/audit/AuditSurface'
import { api } from '@/lib/api'

import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useOverlay as usePixelMarkOverlay } from '@/hooks/useOverlay'
import { useScreenCapture } from '@/hooks/useScreenCapture'
import { useProjectStore } from '@/store/projectStore'
import { useCommentStore } from '@/store/commentStore'
import { useRealtimeStore } from '@/store/realtimeStore'
import { useOverlayStore } from '@/store/overlayStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')
const WS_BASE  = (process.env.NEXT_PUBLIC_WS_BASE  || 'ws://localhost:8765').replace(/\/$/, '')

export default function ProjectPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const router = useRouter()

  // Granular Stores
  const { 
    projects, 
    currentProject, 
    fetchProjects, 
    setCurrentProject,
    loading: isProjectLoading, 
    error: projectError 
  } = useProjectStore()
  
  const { 
    comments, 
    loadComments, 
    loading: isCommentLoading,
    error: commentError 
  } = useCommentStore()

  const { activeTesters, setConnected, updateCursor } = useRealtimeStore()
  const { markers, pendingMarker, setMode, addMarker } = useOverlayStore()
  const { 
    isCommandCenterOpen, 
    isExportPanelOpen, 
    isDesignSystemOpen,
    isSharePanelOpen,
    toggleCommandCenter, 
    toggleExportPanel,
    toggleDesignSystem,
    toggleSharePanel
  } = useUIStore()
  
  const [proxyStatus, setProxyStatus] = useState<'loading' | 'ok' | 'advanced' | 'failed'>('loading')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastEmitRef = useRef(0)
  
  const screenCapture = useScreenCapture()
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Retrieve or create active audit session on mount
  useEffect(() => {
    if (!id) return
    async function initSession() {
      try {
        const list = await api.sessions.getSessions(id)
        if (list && list.length > 0) {
          // Use most recent session
          const sorted = list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setSessionId(sorted[0].id)
        } else {
          // Create a new session
          const newSession = await api.sessions.createSession({ 
            project_id: id, 
            title: `Audit Session - ${new Date().toLocaleDateString()}` 
          })
          setSessionId(newSession.id)
        }
      } catch (err) {
        console.error("Failed to resolve session:", err)
      }
    }
    initSession()
  }, [id])

  // One-time init — offer screen capture when user first holds Ctrl
  useEffect(() => {
    const onFirstCtrl = async (e: KeyboardEvent) => {
      if (e.key !== 'Control') return
      if (screenCapture.isActive()) return
      await screenCapture.init()
    }
    window.addEventListener('keydown', onFirstCtrl)
    return () => window.removeEventListener('keydown', onFirstCtrl)
  }, [screenCapture])

  // Real-time synchronization callback
  const onMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'COMMENT_TRIAGED':
        useCommentStore.getState().updateTriage(msg.comment_id, {
          severity: msg.severity,
          ai_summary: msg.ai_summary,
          suggested_fix: msg.suggested_fix,
        })
        break
        
      case 'NEW_COMMENT':
        useCommentStore.getState().addCommentFromWS(msg.comment)
        break

      case 'CURSOR_MOVE':
        updateCursor(msg.tester_id, msg.x, msg.y, msg.name || msg.tester_name)
        break
    }
  }, [updateCursor])

  const { connected, send } = useRealtimeSync({
    projectId: id,
    onMessage,
    enabled: !!id
  })

  // Phase 5: Screenshot-Enriched Overlay Hook
  usePixelMarkOverlay({
    projectId: id,
    iframeRef: iframeRef,
    captureScreen: screenCapture.capture,
    enabled: proxyStatus === 'ok',
    onMarkerDropped: (payload) => {
      const iframe = iframeRef.current
      if (!iframe) return

      const rect = iframe.getBoundingClientRect()
      addMarker({
        id: crypto.randomUUID(),
        x: (payload.clientX / iframe.clientWidth) * 100,
        y: (payload.clientY / iframe.clientHeight) * 100,
        selector: payload.selector,
        xpath: payload.xpath,
        tagName: payload.tagName,
        innerText: payload.innerText,
        pageUrl: payload.pageUrl,
        elementLabel: payload.tagName + (payload.innerText ? `: ${payload.innerText.slice(0, 20)}` : ''),
        screenshot: payload.screenshot,
      })
      toggleCommandCenter(true)
    }
  })

  // Initial Sync
  useEffect(() => {
    if (!id) return
    
    async function init() {
      await fetchProjects()
      const found = useProjectStore.getState().projects.find(p => p.id === id)
      if (found) setCurrentProject(found)
      await loadComments(id)
    }

    init()
  }, [id, fetchProjects, loadComments, setCurrentProject])

  // Mouse Tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastEmitRef.current < 50) return
    lastEmitRef.current = now

    if (connected) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      send({
        type: 'CURSOR_MOVE',
        tester_id: localStorage.getItem('tester_id'),
        tester_name: localStorage.getItem('tester_name'),
        x, y
      })
    }
  }

  if (isProjectLoading) return (
    <div className="h-screen bg-[#0a0a0b] flex flex-col overflow-hidden font-sans selection:bg-purple-500/30">
      <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Hydrating Project Surface</p>
    </div>
  )

  const error = projectError || commentError
  if (error) return (
    <div className="h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-2">Connection Blocked</h1>
          <p className="text-white/40 text-xs font-mono uppercase leading-relaxed">{typeof error === 'string' ? error : 'Failed to synchronize with audit substrate'}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="rounded-full px-8 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
        >
          Re-engage Substrate
        </Button>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-[#0a0a0b] flex flex-col overflow-hidden font-sans selection:bg-purple-500/30">
      {/* Premium Navigation Header */}
      <header className="h-20 border-b border-white/[0.03] flex items-center justify-between px-8 bg-[#0a0a0b]/80 backdrop-blur-3xl z-40 relative">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-10 w-[1px] bg-white/5" />
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tighter text-white uppercase">{currentProject?.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400 uppercase tracking-widest">Active Audit</span>
            </div>
            <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5 font-mono truncate max-w-xs">{currentProject?.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Design System Button */}
          <Button 
             onClick={() => toggleDesignSystem()}
             variant="outline"
             className={cn(
               "rounded-2xl h-11 px-6 bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest transition-all",
               isDesignSystemOpen ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40" : "hover:bg-white/10"
             )}
          >
             <Palette className="w-4 h-4 mr-2" />
             Aesthetics Controller
          </Button>

          <Button 
            onClick={() => toggleExportPanel()}
            variant="outline"
            className={cn(
               "rounded-2xl h-11 px-6 bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest transition-all",
               isExportPanelOpen ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40" : "hover:bg-white/10"
            )}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Export Audit
          </Button>

          <ShareLinkButton 
            onClick={() => toggleSharePanel()}
            active={isSharePanelOpen}
          />

          <div className="h-10 w-[1px] bg-white/5 mx-2" />
          
          <Button 
            onClick={() => toggleCommandCenter()}
            variant={isCommandCenterOpen ? 'default' : 'secondary'}
            className={cn(
                "rounded-2xl h-11 px-6 text-[10px] font-black uppercase tracking-widest transition-all",
                isCommandCenterOpen 
                    ? "bg-cyan-600 hover:bg-cyan-500 text-black shadow-lg shadow-cyan-900/40" 
                    : "bg-white/5 border border-white/5 text-white/60 hover:text-white"
            )}
          >
            {isCommandCenterOpen ? <PanelRightClose className="w-4 h-4 mr-2" /> : <PanelRightOpen className="w-4 h-4 mr-2" />}
            {isCommandCenterOpen ? 'Close Module' : 'Command Center'}
          </Button>
        </div>
      </header>
      
      {/* Main Viewport Substrate */}
      <main className="flex-1 flex overflow-hidden relative" onMouseMove={handleMouseMove}>
        <div className="flex-1 relative bg-black">
          {/* Status Indicator */}
          <div className={cn(
            "absolute bottom-6 left-6 z-30 px-4 py-2 rounded-2xl backdrop-blur-2xl border transition-all flex items-center gap-3",
            connected ? "bg-green-500/10 border-green-500/20" : "bg-rose-500/10 border-rose-500/20"
          )}>
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-rose-500")} />
            <span className={cn("text-[8px] font-black uppercase tracking-widest", connected ? "text-green-400" : "text-rose-400")}>
              {connected ? 'Substrate Synced' : 'Sync Severed'}
            </span>
          </div>

          <AnimatePresence>
            {isDesignSystemOpen && (
               <motion.div 
                 initial={{ x: -400, opacity: 0 }}
                 animate={{ x: 0, opacity: 1 }}
                 exit={{ x: -400, opacity: 0 }}
                 className="absolute left-0 top-0 bottom-0 w-[400px] z-50 pointer-events-none"
               >
                 <div className="p-6 h-full pointer-events-auto">
                    <DesignSystemPanel projectId={id} />
                 </div>
               </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Proxy Board */}
          {proxyStatus === 'failed' ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#0a0a0b]">
                   <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-40" />
                   <h3 className="text-white/60 font-black uppercase tracking-widest text-sm mb-2">Proxy Negotiation Failed</h3>
                   <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] max-w-sm text-center">Cloudflare or site security is blocking the viewport. Switch to Advanced Mode or contact support.</p>
                   <Button 
                    onClick={() => setProxyStatus('ok')}
                    className="mt-6 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase"
                   >
                     Retry Connection
                   </Button>
                </div>
          ) : (
                <div className="w-full h-full relative group">
                    {sessionId ? (
                      <AuditSurface
                        sessionId={sessionId}
                        projectId={id}
                        onMarkerCreated={(marker) => {
                          loadComments(id)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#0a0a0b]">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Negotiating Audit Session</p>
                      </div>
                    )}
                </div>
          )}
        </div>

        {/* Command Center Slider */}
        <AnimatePresence>
            {isCommandCenterOpen && (
                <motion.div
                    initial={{ x: 400 }}
                    animate={{ x: 0 }}
                    exit={{ x: 400 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-[400px] bg-[#0c0c0e] border-l border-white/[0.03] shadow-2xl z-40 relative flex-shrink-0"
                >
                    <CommandCenter />
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isExportPanelOpen && (
            <ExportPanel 
              projectId={id} 
              projectName={currentProject?.name || 'Unknown Project'}
              commentCount={comments.length}
              onClose={() => toggleExportPanel(false)}
            />
        )}
        {isSharePanelOpen && (
          <ShareLinkPanel 
            sessionId={sessionId || ''} 
            onClose={() => toggleSharePanel(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
