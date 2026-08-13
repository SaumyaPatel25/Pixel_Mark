'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Globe, RefreshCw, AlertCircle, Eye, MousePointerClick } from 'lucide-react'
import { getApiBaseUrl } from '@/lib/api'
import { getProxyPageUrl } from '@/utils/proxyRoutes'
import { useBlueprintStore, BlueprintDOMTarget, inferTargetKind } from '@/store/blueprintStore'
import { useBlueprintCollaborationStore } from '@/store/blueprintCollaborationStore'

interface BlueprintLiveFrameProps {
  url: string
  sessionId?: string
  width: number
  height: number
}

export function BlueprintLiveFrame({ url, sessionId, width, height }: BlueprintLiveFrameProps) {
  const {
    activeTool,
    setSelectedTarget,
    setHoveredTarget,
    pendingMutations,
    selectedFrameId,
    setBaselineSnapshot,
    addMutation
  } = useBlueprintStore()

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [agentReady, setAgentReady] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const isLoading = !iframeLoaded || !agentReady

  // Safety fallback for slow agent initialization
  useEffect(() => {
    if (iframeLoaded && !agentReady) {
      const timer = setTimeout(() => {
        console.warn('[STAGE] Agent ready timeout fallback triggered.')
        setAgentReady(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [iframeLoaded, agentReady])

  // Determine proxy src URL
  const apiBase = getApiBaseUrl()
  const proxySrc = sessionId ? getProxyPageUrl(apiBase, sessionId, url) : null

  // 1. Send Edit Mode state to Iframe when activeTool changes
  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) return

    if (activeTool === 'dom-edit') {
      iframeWindow.postMessage({ type: 'STAGE_ENABLE_EDIT_MODE' }, '*')
      iframeWindow.postMessage({ type: 'STAGE_SET_EDIT_MODE', active: true }, '*')
    } else {
      iframeWindow.postMessage({ type: 'STAGE_DISABLE_EDIT_MODE' }, '*')
      iframeWindow.postMessage({ type: 'STAGE_SET_EDIT_MODE', active: false }, '*')
    }
  }, [activeTool, reloadKey])

  // 2. Reconcile pending mutations to Iframe DOM (Visual Preview on Edit/Undo/Redo/Reset)
  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) return

    iframeWindow.postMessage(
      {
        type: 'STAGE_RECONCILE_MUTATIONS',
        mutations: pendingMutations || []
      },
      '*'
    )
  }, [pendingMutations, reloadKey])

  const lastHoveredSelectorRef = useRef<string | null>(null)
  const hoverRafRef = useRef<number | null>(null)

  // 3. Listen for postMessage events from iframe stage-agent.js
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'STAGE_WEBGL_FAILED') {
        setWebglFailed(true)
        return
      }

      if (data.type === 'STAGE_AGENT_READY') {
        setAgentReady(true)
        setBaselineSnapshot()
        try {
          const iframeWindow = iframeRef.current?.contentWindow
          if (iframeWindow && activeTool === 'dom-edit') {
            iframeWindow.postMessage({ type: 'STAGE_ENABLE_EDIT_MODE' }, '*')
          }
        } catch (_) {}
        return
      }

      if (
        data.type === 'STAGE_EDIT_ELEMENT_SELECTED' ||
        data.type === 'STAGE_DOM_TARGET_SELECTED' ||
        data.type === 'STAGE_CLICK_EVENT'
      ) {
        const selector = data.selector || (data.tag ? data.tag.toLowerCase() : 'div')
        const tag = (data.tag || selector.split('.')[0] || 'div').toLowerCase()
        const xpath = data.xpath || `//${tag}`
        const textExcerpt = data.textExcerpt || data.text || ''
        const targetKind = inferTargetKind(tag, selector)

        const rectObj = data.boundingRect || data.rect || { top: 0, left: 0, width: 100, height: 40 }

        const targetInfo: BlueprintDOMTarget = {
          selector,
          xpath,
          tag,
          textExcerpt: textExcerpt.substring(0, 80),
          boundingRect: rectObj,
          rect: {
            x: rectObj.left || rectObj.x || 0,
            y: rectObj.top || rectObj.y || 0,
            width: rectObj.width || 100,
            height: rectObj.height || 40
          },
          targetKind,
          pageUrl: url || 'https://example.com',
          frameId: selectedFrameId || 'frame_homepage',
          canReplace: true,
          canInsertInside: ['container', 'generic'].includes(targetKind)
        }

        if (activeTool === 'comment') {
          useBlueprintCollaborationStore.getState().startComposingComment({
            selector,
            pageUrl: url || 'https://example.com',
            frameId: selectedFrameId || 'frame_homepage',
            textExcerpt: textExcerpt.substring(0, 80),
            boundingRect: rectObj
          })
        } else {
          setSelectedTarget(targetInfo)
        }
      }

      if (data.type === 'STAGE_DOM_TARGET_HOVERED') {
        const sel = data.selector
        const tag = (data.tag || 'div').toLowerCase()
        if (sel && sel !== lastHoveredSelectorRef.current) {
          lastHoveredSelectorRef.current = sel
          if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current)
          hoverRafRef.current = requestAnimationFrame(() => {
            setHoveredTarget({ selector: sel, tag })
          })
        }
      }

      if (data.type === 'STAGE_DOM_ELEMENT_MOVED') {
        const { sourceSelector, targetParentSelector, action, siblingSelector, targetIndex } = data
        addMutation({
          targetSelector: sourceSelector,
          actionType: 'move',
          presetId: 'element_move',
          presetName: `Move Element (${sourceSelector.split('>').pop()?.trim()})`,
          htmlPayload: JSON.stringify({
            sourceSelector,
            targetParentSelector,
            action,
            siblingSelector,
            targetIndex
          })
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current)
    }
  }, [setSelectedTarget, setHoveredTarget, url, selectedFrameId, activeTool, addMutation])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    setHasError(false)
  }

  const handleIframeError = () => {
    setIframeLoaded(true)
    setAgentReady(true)
    setHasError(true)
  }

  const handleRefresh = () => {
    setIframeLoaded(false)
    setAgentReady(false)
    setWebglFailed(false)
    setHasError(false)
    setReloadKey((prev) => prev + 1)
  }

  return (
    <div className="w-full flex flex-col h-full bg-[#090d16] overflow-hidden rounded-b-2xl relative">
      {/* Live Badge & Address Bar */}
      <div className="h-9 px-3 bg-[#0d1322] border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">
            PROXIED LIVE
          </span>
          <div className="h-3 w-px bg-slate-800 shrink-0" />
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-300 font-mono text-[11px] truncate max-w-[280px]">
            {url || 'https://example.com'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {webglFailed && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse shrink-0">
              WebGL Fallback Active
            </span>
          )}
          {activeTool === 'dom-edit' && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <MousePointerClick className="w-3 h-3" />
              DOM EDIT MODE
            </span>
          )}

          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reload Iframe"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Iframe Viewport Container */}
      <div className="flex-1 relative w-full h-full bg-white">
        {(isLoading || !proxySrc) && (
          <div className="absolute inset-0 bg-[#070a12] z-20 flex flex-col items-center justify-center text-slate-300 p-8">
            {/* Animated Wireframe Skeleton Structure */}
            <div className="w-full max-w-2xl space-y-6 opacity-60 animate-pulse">
              <div className="h-8 bg-slate-800/80 rounded-lg w-full flex items-center px-4 justify-between">
                <div className="h-3 bg-slate-700/80 rounded w-24" />
                <div className="flex gap-2">
                  <div className="h-3 bg-slate-700/80 rounded w-12" />
                  <div className="h-3 bg-slate-700/80 rounded w-12" />
                </div>
              </div>
              <div className="h-44 bg-slate-800/50 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center space-y-3">
                <div className="h-6 bg-slate-700/80 rounded w-2/3" />
                <div className="h-3 bg-slate-700/60 rounded w-1/2" />
                <div className="h-8 bg-cyan-500/20 rounded-lg w-28 border border-cyan-500/30" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-28 bg-slate-800/40 rounded-xl border border-slate-800 p-4 space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded w-3/4" />
                  <div className="h-2 bg-slate-700/40 rounded w-1/2" />
                </div>
                <div className="h-28 bg-slate-800/40 rounded-xl border border-slate-800 p-4 space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded w-3/4" />
                  <div className="h-2 bg-slate-700/40 rounded w-1/2" />
                </div>
                <div className="h-28 bg-slate-800/40 rounded-xl border border-slate-800 p-4 space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded w-3/4" />
                  <div className="h-2 bg-slate-700/40 rounded w-1/2" />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 shadow-lg">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Connecting live proxy session for <strong className="text-slate-200">{url || 'Project'}</strong>...</span>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 bg-[#090d16] z-20 flex flex-col items-center justify-center text-slate-300 text-xs gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <span className="text-sm font-bold text-white">Failed to Proxy Page</span>
            <p className="text-slate-400 max-w-sm">
              The target URL could not be proxied safely. Ensure the backend server is running.
            </p>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {proxySrc && (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={proxySrc}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Blueprint Proxied Surface"
          />
        )}
      </div>
    </div>
  )
}
