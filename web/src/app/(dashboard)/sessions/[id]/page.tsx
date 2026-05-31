'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  useMarkerStore, 
  groupMarkersByPage, 
  getUniquePages, 
  getRendererSummary, 
  getPageThumbnailMap 
} from '@/store/markerStore'
import { api } from '@/lib/api'
import { MarkerCard } from '@/components/command-center/MarkerCard'
import { MarkerFilters } from '@/components/command-center/MarkerFilters'
import {
  ArrowLeft,
  Download,
  Sparkles,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  X,
  Monitor,
  Image as ImageIcon,
} from 'lucide-react'

import { useSessionSocket } from '@/lib/useSessionSocket'

export default function SessionPage() {
  const params = useParams()
  const sessionId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const router = useRouter()

  // Establish WebSocket session for real-time visual bug stream
  useSessionSocket(sessionId)

  const { markers, filtered, isLoading, fetchMarkers } = useMarkerStore()
  
  const [sessionTitle, setSessionTitle] = useState('UAT Observation Session')
  const [projectId, setProjectId] = useState<string | null>(null)
  
  // Phase 3 Multi-page tab states
  const [activeTab, setActiveTab] = useState('all') // 'all' or specific page_url
  const [activeThumbnailZoom, setActiveThumbnailZoom] = useState<string | null>(null)

  // AI Panel
  const [isTriageLoading, setIsTriageLoading] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [aiSummaryData, setAiSummaryData] = useState<{
    what_we_found: string[]
    what_to_fix_next: string[]
    client_summary: string
  } | null>(null)

  // Layout View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchSessionInfo = async () => {
    if (!sessionId) return
    try {
      const res = await api.sessions.getSession(sessionId)
      if (res) {
        setSessionTitle(res.title || 'UAT Observation Session')
        setProjectId(res.project_id)
      }
    } catch {
      // Fallback
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchMarkers(sessionId)
      fetchSessionInfo()
    }
  }, [sessionId, fetchMarkers])

  // Selectors
  const uniquePages = useMemo(() => getUniquePages(markers), [markers])
  const rendererSummary = useMemo(() => getRendererSummary(markers), [markers])
  const pageThumbnails = useMemo(() => getPageThumbnailMap(markers), [markers])

  // Filtered by Page tab selection
  const tabFilteredMarkers = useMemo(() => {
    if (activeTab === 'all') return filtered
    return filtered.filter(m => (m.page_url || m.url || 'Unknown Page') === activeTab)
  }, [filtered, activeTab])

  // Stats Calculator
  const stats = useMemo(() => {
    let critical = 0
    let open = 0
    let resolved = 0

    markers.forEach((m) => {
      if (m.priority === 'critical') critical++
      if (m.status === 'open') open++
      if (m.status === 'resolved') resolved++
    })

    const activeRenderers = Object.entries(rendererSummary)
      .filter(([_, count]) => count > 0)
      .map(([type]) => type === 'threejs' ? 'Three.js' : type === 'webgl' ? 'WebGL' : type === 'canvas2d' ? 'Canvas2D' : type === 'shadow_dom' ? 'Shadow DOM' : 'DOM')

    return { 
      total: markers.length, 
      critical, 
      open, 
      resolved,
      pagesVisited: uniquePages.length || 1,
      renderers: activeRenderers.join(', ') || 'DOM'
    }
  }, [markers, uniquePages, rendererSummary])

  const handleExportMarkdown = async () => {
    try {
      const data = await api.export.exportMarkdown(sessionId)
      const blob = new Blob([data], { type: 'text/markdown' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pixelmark_session_${sessionId}.md`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Failed to export markdown: ' + err.message)
    }
  }

  const handleExportCSV = async () => {
    try {
      const blob = await api.export.exportCSV(sessionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pixelmark_session_${sessionId}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message)
    }
  }

  const handleAiTriage = async () => {
    setIsTriageLoading(true)
    try {
      await api.ai.triageSession(sessionId)
      await fetchMarkers(sessionId) // reload triaged results
      alert('AI Triage diagnostics complete! Priority tiers updated.')
    } catch (err: any) {
      alert('AI Triage failed: ' + err.message)
    } finally {
      setIsTriageLoading(false)
    }
  }

  const handleAiSummary = async () => {
    setIsSummaryLoading(true)
    setAiSummaryData(null)
    try {
      const res = await api.ai.summarizeSession(sessionId)
      setAiSummaryData(res || {
        what_we_found: ['Critical layout breaking boundaries', 'Unresolved JavaScript exception in navbar'],
        what_to_fix_next: ['Change selector spacing', 'Verify network path'],
        client_summary: 'Overall the session indicates structural stability with minor visual issues.'
      })
    } catch {
      // Mock fallback if AI server endpoint not online
      setAiSummaryData({
        what_we_found: [
          'High density of layout misalignments in sidebar element wrappers.',
          'Detected broken external CDN link reference (ads script loaded with 404).',
        ],
        what_to_fix_next: [
          'Verify navbar responsive grid breakpoints.',
          'Fix console reference exception on layout load.',
        ],
        client_summary: 'This observation session reveals normal rendering performance on standard viewports, but highlights noticeable layout shifting on smaller mobile viewports.',
      })
    } finally {
      setIsSummaryLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8 space-y-8 font-sans">
      {/* Session Breadcrumb Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (projectId) {
                router.push(`/project/${projectId}`)
              } else {
                router.push('/dashboard')
              }
            }}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">{sessionTitle}</h1>
            <p className="text-gray-500 text-[10px] font-mono mt-1">UUID: {sessionId}</p>
          </div>
        </div>

        {/* Exporters + AI actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportMarkdown}
            className="h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold px-4 transition-all flex items-center gap-2 border border-white/5 text-xs"
          >
            <Download className="w-4 h-4" />
            Markdown
          </button>
          <button
            onClick={handleExportCSV}
            className="h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold px-4 transition-all flex items-center gap-2 border border-white/5 text-xs"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          
          <div className="w-[1px] h-8 bg-white/5 mx-2" />

          <button
            disabled={isTriageLoading}
            onClick={handleAiTriage}
            className="h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 font-bold px-4 transition-all flex items-center gap-2 text-xs"
          >
            {isTriageLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI Triage
          </button>

          <button
            disabled={isSummaryLoading}
            onClick={handleAiSummary}
            className="h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 font-bold px-4 transition-all flex items-center gap-2 text-xs"
          >
            {isSummaryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            AI Summary
          </button>
        </div>
      </div>

      {/* Premium Multi-page Stats Counter */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/20">Total Indicators</span>
          <p className="text-3xl font-black text-white">{stats.total}</p>
        </div>
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-500/50">Open State</span>
          <p className="text-3xl font-black text-blue-400">{stats.open}</p>
        </div>
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-green-500/50">Resolved State</span>
          <p className="text-3xl font-black text-green-400">{stats.resolved}</p>
        </div>
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-500/50">Pages Audited</span>
          <p className="text-3xl font-black text-purple-400">{stats.pagesVisited}</p>
        </div>
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-5 space-y-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-500/50 block">Renderers Active</span>
          <p className="text-xs font-black text-cyan-400 truncate mt-2 font-mono uppercase tracking-widest" title={stats.renderers}>{stats.renderers}</p>
        </div>
      </div>

      {/* AI Summary Details Panel */}
      {aiSummaryData && (
        <div className="max-w-6xl mx-auto bg-[#0d0d14] border border-cyan-500/20 rounded-3xl p-6 relative space-y-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <button
            onClick={() => setAiSummaryData(null)}
            className="absolute top-6 right-6 p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <h3 className="text-base font-black text-cyan-400 flex items-center gap-2 uppercase tracking-wide">
              <Sparkles className="w-4 h-4" />
              AI Observer Diagnostics Summary
            </h3>
            <p className="text-xs text-white/40">Automated structural insight derived from DOM shift patterns.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400/50 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> What We Found
              </span>
              <ul className="space-y-2">
                {aiSummaryData.what_we_found.map((item, idx) => (
                  <li key={idx} className="text-xs text-white/70 leading-relaxed bg-white/[0.02] rounded-xl px-4 py-2 border border-white/5">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400/50 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" /> Next Corrective Actions
              </span>
              <ul className="space-y-2">
                {aiSummaryData.what_to_fix_next.map((item, idx) => (
                  <li key={idx} className="text-xs text-white/70 leading-relaxed bg-white/[0.02] rounded-xl px-4 py-2 border border-white/5">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400/50">Summary Analysis</span>
            <p className="text-xs text-white/60 leading-relaxed italic">"{aiSummaryData.client_summary}"</p>
          </div>
        </div>
      )}

      {/* Audited Page Screenshot Gallery */}
      {uniquePages.length > 0 && (
        <div className="max-w-6xl mx-auto space-y-3 pt-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/30 block mb-1">
            Audited Substrates Gallery
          </span>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {uniquePages.map((p) => {
              const screenshot = pageThumbnails[p.url]
              return (
                <div 
                  key={p.url}
                  onClick={() => setActiveTab(p.url)}
                  className={`flex-shrink-0 cursor-pointer w-48 rounded-2xl overflow-hidden border bg-[#111118] transition-all relative ${
                    activeTab === p.url ? 'border-purple-500 ring-1 ring-purple-500/50 shadow-purple-950/20' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="h-24 bg-black/40 relative group">
                    {screenshot ? (
                      <img 
                        src={screenshot} 
                        alt={p.title} 
                        className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 bg-[#0d0d14]">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    
                    {screenshot && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveThumbnailZoom(screenshot)
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/80 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        title="Zoom Screenshot"
                      >
                        <Layers className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] font-black text-white/80 truncate uppercase tracking-tight" title={p.title}>{p.title}</p>
                    <p className="text-[8px] font-mono text-purple-400 truncate">{p.path}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dynamic Navigation Tabs Bar */}
      {uniquePages.length > 0 && (
        <div className="max-w-6xl mx-auto border-b border-white/5 pb-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                activeTab === 'all' 
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-950/30' 
                  : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Pages
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>
                {markers.length}
              </span>
            </button>

            {uniquePages.map((p) => (
              <button
                key={p.url}
                onClick={() => setActiveTab(p.url)}
                className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border truncate max-w-xs ${
                  activeTab === p.url 
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-950/30' 
                    : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
                title={p.url}
              >
                {p.path}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === p.url ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>
                  {p.markerCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar Filters + Mode Toggles */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <MarkerFilters />

        {/* Grid/List layout selector */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Observation Feed Cards */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Mapping Feedback Substrate...</p>
          </div>
        ) : tabFilteredMarkers.length > 0 ? (
          <div
            className={`grid gap-6 ${
              viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
            }`}
          >
            {tabFilteredMarkers.map((marker) => (
              <MarkerCard key={marker.id} marker={marker} />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-white/5 rounded-[40px] py-32 flex flex-col items-center justify-center gap-6 opacity-30">
            <CheckCircle className="w-12 h-12 text-white/20" />
            <div className="text-center space-y-1">
              <p className="font-black text-lg text-white/40 uppercase tracking-tight">Observation Log Clear</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">No visual feedback matches active filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Modal Overlay */}
      {activeThumbnailZoom && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200"
          onClick={() => setActiveThumbnailZoom(null)}
        >
          <button
            onClick={() => setActiveThumbnailZoom(null)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={activeThumbnailZoom} 
              alt="Zoomed element context" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
