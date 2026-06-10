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
import { useViewportHeight } from '@/hooks/useViewportHeight'
import { useProjectStore } from '@/store/projectStore'
import { useCommentStore } from '@/store/commentStore'
import { useRealtimeStore } from '@/store/realtimeStore'
import { useOverlayStore } from '@/store/overlayStore'
import { useUIStore } from '@/store/uiStore'
import { useSessionStore } from '@/store/sessionStore'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')
const WS_BASE  = (process.env.NEXT_PUBLIC_WS_BASE  || 'ws://localhost:8765').replace(/\/$/, '')

const drawerVariants = {
  open: { x: 0, y: 0 },
  closed: (custom: { isMobile: boolean; isDesktop: boolean }) => ({
    x: custom.isDesktop ? 400 : (custom.isMobile ? 0 : "100%"),
    y: custom.isMobile ? "100%" : 0
  })
}

export default function ProjectPage() {
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isMobile = hasMounted ? window.innerWidth < 768 : false
  const isDesktop = hasMounted ? window.innerWidth >= 1024 : false
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

  const { heavy_mode, renderer_type } = useSessionStore()
  
  const [proxyStatus, setProxyStatus] = useState<'loading' | 'ok' | 'advanced' | 'failed'>('loading')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastEmitRef = useRef(0)
  
  const screenCapture = useScreenCapture()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const viewportHeight = useViewportHeight()

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

  // Below tablet breakpoint or in heavy mode, collapse the command center by default on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024 || heavy_mode) {
        toggleCommandCenter(false)
      } else {
        toggleCommandCenter(true)
      }
    }
  }, [toggleCommandCenter, heavy_mode])

  // A11y Focus Management: shift focus to close button when opened, restore to trigger when closed
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isCommandCenterOpen) {
      setTimeout(() => {
        const closeBtn = document.getElementById('close-command-center-btn') || document.getElementById('command-center-trigger')
        if (closeBtn) closeBtn.focus()
      }, 150)
    } else {
      const triggerBtn = document.getElementById('command-center-trigger')
      if (triggerBtn) {
        setTimeout(() => triggerBtn.focus(), 150)
      }
    }
  }, [isCommandCenterOpen])

  // Escape key listener to dismiss command center drawer on mobile/tablet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCommandCenterOpen) {
        toggleCommandCenter(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCommandCenterOpen, toggleCommandCenter])

  // Listen for window resize to recover and adapt layout state cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return
    let wasMobile = window.innerWidth < 768
    
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile !== wasMobile) {
        if (isMobile) {
          toggleCommandCenter(false)
        } else {
          toggleCommandCenter(true)
        }
        wasMobile = isMobile
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [toggleCommandCenter])

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
    if (heavy_mode) return // Skip mouse cursor sync in heavy mode to reduce pointer listeners complexity
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

  const pageStyle = viewportHeight > 0 ? { height: `${viewportHeight}px` } : {}

  return (
    <div 
      style={pageStyle}
      className="h-screen bg-[#0a0a0b] flex flex-col overflow-hidden font-sans selection:bg-purple-500/30"
    >
      {/* Premium Navigation Header */}
      <header className={cn(
        "min-h-16 h-auto md:h-20 py-3 md:py-0 border-b border-white/[0.03] flex flex-col md:flex-row items-center justify-between px-4 md:px-8 bg-[#0a0a0b]/80 backdrop-blur-3xl z-45 relative gap-3",
        heavy_mode && "max-md:absolute max-md:top-4 max-md:left-4 max-md:right-4 max-md:rounded-2xl max-md:border max-md:border-white/15 max-md:bg-[#0a0a0b]/90 max-md:shadow-2xl max-md:h-12 max-md:min-h-0 max-md:py-0 max-md:flex-row max-md:px-3 max-md:gap-1 max-md:w-auto"
      )}>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-xl flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="h-10 w-[1px] bg-white/5 hidden sm:block flex-shrink-0" />
            
            <div className={cn("min-w-0", heavy_mode && "max-md:hidden")}>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-lg font-black tracking-tighter text-white uppercase truncate max-w-[140px] sm:max-w-none">{currentProject?.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400 uppercase tracking-widest flex-shrink-0">Active Audit</span>
              </div>
              <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5 font-mono truncate max-w-[180px] sm:max-w-xs">{currentProject?.url}</p>
            </div>
          </div>
        </div>

        <div className={cn("flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap justify-end w-full md:w-auto", heavy_mode && "max-md:w-auto max-md:flex-nowrap max-md:justify-end")}>
          {/* Design System Button */}
          <Button 
             onClick={() => toggleDesignSystem()}
             variant="outline"
             className={cn(
               "rounded-2xl h-10 md:h-11 px-3 md:px-6 bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center flex-shrink-0",
               isDesignSystemOpen ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40" : "hover:bg-white/10",
               heavy_mode && "max-md:hidden"
             )}
          >
             <Palette className="w-4 h-4" />
             <span className="hidden md:inline ml-2">Aesthetics Controller</span>
          </Button>

          <Button 
            onClick={() => toggleExportPanel()}
            variant="outline"
            className={cn(
               "rounded-2xl h-10 md:h-11 px-3 md:px-6 bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center flex-shrink-0",
               isExportPanelOpen ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40" : "hover:bg-white/10",
               heavy_mode && "max-md:hidden"
            )}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline ml-2">Export Audit</span>
          </Button>

          <div className={cn("flex-shrink-0", heavy_mode && "max-md:hidden")}>
            <ShareLinkButton 
              onClick={() => toggleSharePanel()}
              active={isSharePanelOpen}
            />
          </div>

          <div className="h-10 w-[1px] bg-white/5 mx-1 md:mx-2 hidden sm:block flex-shrink-0" />
                    <Button 
            id="command-center-trigger"
            aria-label="Toggle Command Center"
            aria-controls="command-center-drawer"
            aria-expanded={isCommandCenterOpen}
            onClick={() => toggleCommandCenter()}
            variant={isCommandCenterOpen ? 'default' : 'secondary'}
            className={cn(
                "rounded-2xl h-10 md:h-11 px-3 md:px-6 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center flex-shrink-0 focus:ring-2 focus:ring-cyan-400 outline-none",
                isCommandCenterOpen 
                    ? "bg-cyan-600 hover:bg-cyan-500 text-black shadow-lg shadow-cyan-900/40" 
                    : "bg-white/5 border border-white/5 text-white/60 hover:text-white",
                heavy_mode && "max-md:h-8 max-md:w-8 max-md:px-0 max-md:rounded-xl"
            )}
          >
            {isCommandCenterOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className={cn("hidden md:inline ml-2", heavy_mode && "max-md:hidden")}>
              {isCommandCenterOpen ? 'Close Module' : 'Command Center'}
            </span>
          </Button>
        </div>
      </header>
      
      {/* Main Viewport Substrate */}
      <main className="flex-1 flex overflow-hidden relative" onMouseMove={handleMouseMove}>
        <div className="flex-1 relative bg-black h-full overflow-hidden">
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
                 className="absolute left-0 top-0 bottom-0 w-full sm:w-[400px] z-50 pointer-events-none"
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

        {/* Tap-dismiss backdrop overlay for mobile/tablet drawer */}
        <AnimatePresence>
            {isCommandCenterOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    onClick={() => toggleCommandCenter(false)}
                    className="absolute inset-0 bg-black/60 z-48 lg:hidden"
                />
            )}
        </AnimatePresence>

        {/* Command Center Slider (Fully Responsive Layout Wrapper) */}
        <AnimatePresence>
            {isCommandCenterOpen && (
                <motion.div
                    id="command-center-drawer"
                    role="dialog"
                    aria-label="Command Center Feedback Stream"
                    aria-modal="true"
                    custom={{ isMobile, isDesktop }}
                    variants={drawerVariants}
                    initial={false}
                    animate={isCommandCenterOpen ? "open" : "closed"}
                    exit="closed"
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={cn(
                      "bg-[#0c0c0e] shadow-2xl flex flex-col flex-shrink-0 transition-all duration-300",
                      // Mobile: Bottom sheet styling
                      "w-full h-[60dvh] absolute bottom-0 left-0 right-0 border-t border-white/[0.05] rounded-t-[32px] z-50 overflow-hidden",
                      // Tablet: Side drawer overlay
                      "md:w-[380px] md:h-full md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:border-l md:border-t-0 md:rounded-t-none md:z-50",
                      // Desktop: Side-by-side layout
                      "lg:relative lg:w-[400px] lg:z-40"
                    )}
                >
                    {/* Swipe bar for mobile bottom sheet */}
                    <div className="w-full flex justify-center py-2.5 md:hidden cursor-pointer" onClick={() => toggleCommandCenter()}>
                      <div className="w-12 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
                    </div>
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
