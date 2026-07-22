'use client'

import React, { useState, useMemo } from 'react'
import { useDOMEditStore } from '@/store/domEditStore'
import { useUIStore } from '@/store/uiStore'
import { DOMEdit } from '@/lib/api'
import { Download, Trash2, ChevronDown, ChevronRight, RotateCcw, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StyleEditsTabProps {
  sessionId: string
}

export function StyleEditsTab({ sessionId }: StyleEditsTabProps) {
  const { edits, deleteEdit, exportCSS, exportMarkdown, exportJSON, exportAIImplementation } = useDOMEditStore()
  const addToast = useUIStore(state => state.addToast)

  // Track which page sections are expanded/collapsed
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({})

  const togglePageCollapse = (pageUrl: string) => {
    setCollapsedPages(prev => ({
      ...prev,
      [pageUrl]: !prev[pageUrl]
    }))
  }

  // Group edits by page URL
  const groupedEdits = useMemo(() => {
    const groups: Record<string, DOMEdit[]> = {}
    edits.forEach(edit => {
      const url = edit.page_url || 'Unknown Page'
      if (!groups[url]) {
        groups[url] = []
      }
      groups[url].push(edit)
    })
    return Object.entries(groups)
  }, [edits])

  const handleRevert = async (editId: string) => {
    try {
      await deleteEdit(sessionId, editId)
      addToast('Style reverted ✓', 'success')
      // Post message to iframe to refresh edits
      window.postMessage({ type: 'STAGE_DEACTIVATE_DOM_EDIT' }, '*')
      setTimeout(() => {
        window.postMessage({ type: 'STAGE_ACTIVATE_DOM_EDIT' }, '*')
      }, 50)
    } catch (err: any) {
      addToast('Failed to revert style: ' + err.message, 'error')
    }
  }

  const handleResetPage = async (pageUrl: string, pageEdits: DOMEdit[]) => {
    if (!confirm(`Are you sure you want to reset all style edits for this page?`)) {
      return
    }
    try {
      await Promise.all(pageEdits.map(edit => deleteEdit(sessionId, edit.id)))
      addToast('Page styles reset ✓', 'success')
      window.postMessage({ type: 'STAGE_DEACTIVATE_DOM_EDIT' }, '*')
      setTimeout(() => {
        window.postMessage({ type: 'STAGE_ACTIVATE_DOM_EDIT' }, '*')
      }, 50)
    } catch (err: any) {
      addToast('Failed to reset styles: ' + err.message, 'error')
    }
  }

  const handleExportCSS = async () => {
    try {
      await exportCSS(sessionId)
      addToast('CSS stylesheet exported ✓', 'success')
    } catch (err: any) {
      addToast('Failed to export CSS: ' + err.message, 'error')
    }
  }

  const handleExportMarkdown = async () => {
    try {
      await exportMarkdown(sessionId)
      addToast('Markdown summary exported ✓', 'success')
    } catch (err: any) {
      addToast('Failed to export Markdown: ' + err.message, 'error')
    }
  }

  const handleExportJSON = async () => {
    try {
      await exportJSON(sessionId)
      addToast('JSON data exported ✓', 'success')
    } catch (err: any) {
      addToast('Failed to export JSON: ' + err.message, 'error')
    }
  }

  const handleExportAIImplementation = async () => {
    try {
      await exportAIImplementation(sessionId)
      addToast('AI_IMPLEMENTATION.md exported ✓', 'success')
    } catch (err: any) {
      addToast('Failed to export AI Guide: ' + err.message, 'error')
    }
  }

  const getUrlPath = (url: string) => {
    try {
      const parsed = new URL(url)
      return parsed.pathname === '/' ? '/' : parsed.pathname + parsed.search
    } catch {
      return url
    }
  }

  if (edits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <div className="w-16 h-16 rounded-3xl bg-[#01696f]/10 border border-teal-500/20 flex items-center justify-center mb-4">
          <Wand2 className="w-8 h-8 text-teal-400" />
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">No style edits yet</h4>
        <p className="text-xs text-white/40 max-w-[240px] leading-relaxed">
          Activate Edit Mode in the review toolbar and click any element to restyle it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Top action bar with 4 export options */}
      <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Active Style Tweaks</span>
            <span className="text-xs font-black text-white mt-0.5">{edits.length} Edits Recorded</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={handleExportCSS}
            className="h-8 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/30 active:scale-95 text-teal-200 font-extrabold text-[10px] uppercase tracking-wider px-2.5 flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Download pure CSS stylesheet"
          >
            <Download className="w-3 h-3 text-teal-400" />
            CSS (.css)
          </button>
          <button
            onClick={handleExportAIImplementation}
            className="h-8 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 active:scale-95 text-purple-200 font-extrabold text-[10px] uppercase tracking-wider px-2.5 flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Download AI IDE & Developer implementation guide"
          >
            <Wand2 className="w-3 h-3 text-purple-400" />
            AI Guide (.md)
          </button>
          <button
            onClick={handleExportMarkdown}
            className="h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Download Markdown summary table"
          >
            <Download className="w-3 h-3 text-slate-400" />
            Markdown (.md)
          </button>
          <button
            onClick={handleExportJSON}
            className="h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Download JSON data model"
          >
            <Download className="w-3 h-3 text-slate-400" />
            JSON (.json)
          </button>
        </div>
      </div>

      {/* Grouped lists */}
      <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-1 custom-scrollbar">
        {groupedEdits.map(([pageUrl, pageEdits]) => {
          const isCollapsed = !!collapsedPages[pageUrl]
          const pagePath = getUrlPath(pageUrl)

          return (
            <div key={pageUrl} className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden">
              {/* Group Header */}
              <div 
                className="flex items-center justify-between p-4 bg-[#111116] border-b border-white/5 cursor-pointer select-none"
                onClick={() => togglePageCollapse(pageUrl)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white/80 truncate font-mono" title={pageUrl}>
                      {pagePath}
                    </h4>
                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider mt-0.5">
                      {pageEdits.length} style tweak{pageEdits.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleResetPage(pageUrl, pageEdits)}
                    title="Reset all styles on page"
                    className="h-7 w-7 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Group Body */}
              {!isCollapsed && (
                <div className="divide-y divide-white/[0.03] p-2 bg-[#09090c]/50">
                  {pageEdits.map(edit => (
                    <div key={edit.id} className="p-3 flex items-start justify-between gap-4 group">
                      <div className="min-w-0 space-y-2 flex-1">
                        {/* Selector info */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono font-bold">
                            {edit.element_tag || 'ELEMENT'}
                          </span>
                          <span className="text-[9px] font-mono text-cyan-400/80 truncate max-w-[180px]" title={edit.selector}>
                            {edit.selector}
                          </span>
                        </div>

                        {/* Style changes */}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/60 bg-black/20 p-2 rounded-lg border border-white/5">
                          <span className="text-white/40">{edit.property}:</span>
                          <span className="line-through text-rose-400/80">{edit.old_value || 'none'}</span>
                          <span className="text-white/30">→</span>
                          <span className="text-emerald-400 font-bold">{edit.new_value}</span>
                        </div>
                      </div>

                      {/* Row Action */}
                      <button
                        onClick={() => handleRevert(edit.id)}
                        title="Revert this style"
                        className="h-7 w-7 rounded-lg bg-white/5 hover:bg-rose-500/10 text-white/40 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center self-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
