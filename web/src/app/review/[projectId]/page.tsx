'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useOverlay, MarkerPayload } from '@/hooks/useOverlay'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useCommentStore } from '@/store/commentStore'
import { api } from '@/lib/api'

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')

type ProxyStatus = 'loading' | 'ok' | 'error'
type SaveState   = 'idle' | 'saving' | 'saved' | 'error'

export default function ReviewPage() {
  const { projectId }  = useParams<{ projectId: string }>()
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const iframeRef      = useRef<HTMLIFrameElement>(null)

  const [testerName,  setTesterName]  = useState('Anonymous')
  const [testerRole,  setTesterRole]  = useState('tester')
  const [testerToken, setTesterToken] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTesterName(localStorage.getItem('tester_name') ?? 'Anonymous')
      setTesterRole(localStorage.getItem('tester_role') ?? 'tester')
      setTesterToken(localStorage.getItem('tester_token') ?? '')
    }
  }, [])

  const role  = (searchParams.get('role')  ?? testerRole)  as 'tester' | 'reviewer' | 'viewer'
  const token = searchParams.get('token') ?? testerToken

  const [project,       setProject]       = useState<{ name: string; target_url: string } | null>(null)
  const [proxyStatus,   setProxyStatus]   = useState<ProxyStatus>('loading')
  const [activeMarker,  setActiveMarker]  = useState<MarkerPayload | null>(null)
  const [cmdOpen,       setCmdOpen]       = useState(false)
  const { connected: wsConnected }        = useRealtimeSync({
    projectId,
    onMessage: (msg: any) => {
      if (msg.type === 'NEW_COMMENT') {
        useCommentStore.getState().addCommentFromWS(msg.comment)
      }
    },
    enabled: true,
  })

  // ── Validate & load the project via the token ────────────────────────────
  useEffect(() => {
    if (!token || !projectId) { router.replace('/'); return }
    fetch(`${BASE}/resolve-token/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(d => {
        if (d.project_id === projectId) {
          setProject({ name: d.project_name, target_url: d.target_url })
        } else {
          console.error('[ReviewPage] project_id mismatch', d)
          router.replace('/')
        }
      })
      .catch(() => router.replace('/'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId])

  // ── Preflight the proxy URL ──────────────────────────────────────────────
  useEffect(() => {
    if (!project?.target_url) return
    const url = `${BASE}/proxy?url=${encodeURIComponent(project.target_url)}&project_id=${projectId}`
    fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
      .then(r => setProxyStatus(r.ok ? 'ok' : 'error'))
      .catch(() => setProxyStatus('error'))
  }, [project?.target_url, projectId])

  // ── Overlay hook ─────────────────────────────────────────────────────────
  useOverlay({
    projectId,
    iframeRef,
    enabled: role !== 'viewer' && proxyStatus === 'ok',
    onMarkerDropped: useCallback((payload: MarkerPayload) => {
      const iframe = iframeRef.current
      if (!iframe) {
        setActiveMarker(payload)
      } else {
        // Convert raw pixels to 0-100 percentages before state storage 
        // This ensures backend Pydantic validation (le=100) always passes
        setActiveMarker({
          ...payload,
          clientX: (payload.clientX / iframe.clientWidth) * 100,
          clientY: (payload.clientY / iframe.clientHeight) * 100,
        })
      }
      setCmdOpen(true)
    }, []),
  })

  const proxyUrl = project
    ? `${BASE}/proxy?url=${encodeURIComponent(project.target_url)}&project_id=${projectId}`
    : undefined

  return (
    <div className="flex flex-col h-screen bg-[#080810] overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-[#0c0c14] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-purple-500 font-mono text-xs tracking-widest">ENTREXT</span>
          <span className="text-white/20 text-xs">|</span>
          <span className="text-white/60 text-sm truncate max-w-[200px]">{project?.name ?? '...'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            <span className="text-[10px] text-white/30 font-mono">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
            {role.toUpperCase()}
          </span>
          <span className="text-[11px] text-white/40">{testerName}</span>
        </div>
      </div>

      {/* ── Content area ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading overlay */}
        {proxyStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080810] z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/40 text-sm">Loading review surface...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {proxyStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080810] z-10">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-white font-bold text-xl mb-2">Could not load site</h2>
              <p className="text-white/40 text-sm">The target URL may be blocking iframes</p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={proxyUrl}
          title={`Review: ${project?.name ?? 'Audit Viewport'}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className={`w-full h-full border-0 ${proxyStatus !== 'ok' ? 'invisible' : ''}`}
          onLoad={() => setProxyStatus('ok')}
        />

        {/* Ctrl+Click hint badge */}
        {role !== 'viewer' && proxyStatus === 'ok' && !cmdOpen && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none select-none">
            <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
              <kbd className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-mono">Ctrl</kbd>
              <span className="text-white/40 text-[11px]">+ Click to annotate</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Command Center ────────────────────────────────────────────────── */}
      {cmdOpen && activeMarker && (
        <TesterCommandCenter
          marker={activeMarker}
          projectId={projectId}
          testerName={testerName}
          testerRole={role}
          onClose={() => { setCmdOpen(false); setActiveMarker(null) }}
        />
      )}
    </div>
  )
}

// ── Inline Tester Command Center ────────────────────────────────────────────
interface MarkerProps {
  marker:     MarkerPayload
  projectId:  string
  testerName: string
  testerRole: string
  onClose:    () => void
}

function TesterCommandCenter({ marker, projectId, testerName, testerRole, onClose }: MarkerProps) {
  const { addComment } = useCommentStore()
  const [text,      setText]      = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')

  const safeStr = (v: unknown) => (v == null ? '' : typeof v === 'string' ? v : String(v))
  const safeNum = (v: unknown) => (v == null || isNaN(Number(v)) ? 0 : Number(v))

  const handleSave = async () => {
    if (!text.trim() || saveState === 'saving') return
    setSaveState('saving')
    setSaveError('')

    try {
      await addComment({
        project_id:         projectId,
        text:               text.trim(),
        component_selector: safeStr(marker.selector),
        xpath:              safeStr(marker.xpath),
        tag_name:           safeStr(marker.tagName),
        inner_text:         safeStr(marker.innerText),
        page_url:           safeStr(marker.pageUrl),
        tester_name:        testerName,
        x:                  safeNum(marker.clientX),
        y:                  safeNum(marker.clientY),
        marker_number:      safeNum(marker.markerNumber),
        screenshot_url:     '',  // empty string → backend coerces to null
      })
      setSaveState('saved')
      setTimeout(() => { setSaveState('idle'); onClose() }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setSaveError(msg)
      setSaveState('error')
    }
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0c0c14] border-l border-white/[0.08] flex flex-col z-20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div>
          <p className="text-white text-sm font-semibold">Leave Feedback</p>
          <p className="text-white/30 text-[10px] font-mono mt-0.5">MARKER #{marker.markerNumber}</p>
        </div>
        <button onClick={onClose}
          className="text-white/30 hover:text-white text-xl w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
          ×
        </button>
      </div>

      {/* Element info */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
            &lt;{marker.tagName ?? 'div'}&gt;
          </span>
          <span className="text-[10px] text-white/30 font-mono truncate flex-1">{marker.selector}</span>
        </div>
        {marker.innerText && (
          <p className="text-[10px] text-white/20 font-mono truncate">"{marker.innerText}"</p>
        )}
      </div>

      {/* Role badge */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-mono text-white/30">Submitting as </span>
        <span className="text-[10px] font-mono text-purple-400">{testerName}</span>
        <span className="text-[10px] font-mono text-white/20"> ({testerRole})</span>
      </div>

      {/* Text area */}
      <div className="flex-1 px-4 py-2">
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Describe the issue or improvement..."
          className="w-full h-full min-h-[120px] bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5
                     text-white text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors
                     placeholder-white/20"
        />
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-2">
        {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
        <button
          onClick={handleSave}
          disabled={!text.trim() || saveState === 'saving' || saveState === 'saved'}
          className={[
            'w-full py-3 rounded-xl text-sm font-semibold transition-all',
            saveState === 'saved'  ? 'bg-green-600 text-white cursor-default' :
            saveState === 'error'  ? 'bg-red-600 hover:bg-red-500 text-white' :
            'bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white'
          ].join(' ')}
        >
          {saveState === 'saving' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : saveState === 'saved' ? '✓ Feedback Saved'
            : saveState === 'error' ? '↺ Retry'
            : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}
