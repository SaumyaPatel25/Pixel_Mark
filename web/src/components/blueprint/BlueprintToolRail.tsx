'use client'

import React from 'react'
import {
  MousePointer,
  Square,
  Layout,
  Type,
  Shapes,
  MessageSquare,
  MousePointerClick,
  FolderOpen,
  Layers,
  Sparkles
} from 'lucide-react'
import { useBlueprintStore, BlueprintTool } from '@/store/blueprintStore'

export function BlueprintToolRail() {
  const {
    activeTool,
    setActiveTool,
    isLayersOpen,
    toggleLayers,
    isLibraryOpen,
    toggleLibrary,
    addFrame
  } = useBlueprintStore()

  const tools: { id: BlueprintTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Select' },
    { id: 'frame', icon: <Square className="w-4 h-4" />, label: 'New Frame' },
    { id: 'section', icon: <Layout className="w-4 h-4" />, label: 'Section' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text Node' },
    { id: 'shape', icon: <Shapes className="w-4 h-4" />, label: 'Shape / Box' },
    { id: 'dom-edit', icon: <MousePointerClick className="w-4 h-4" />, label: 'DOM Edit Tool' },
    { id: 'comment', icon: <MessageSquare className="w-4 h-4" />, label: 'Comment' }
  ]

  const handleToolClick = (toolId: BlueprintTool) => {
    if (toolId === 'frame') {
      addFrame()
      setActiveTool('select')
    } else {
      setActiveTool(toolId)
    }
  }

  return (
    <aside className="w-14 bg-[#0b101d] border-r border-cyan-950/60 flex flex-col items-center py-3 justify-between select-none z-10 shrink-0">
      {/* Top section: Main Editor Tools */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        {tools.map((t) => {
          const isActive = activeTool === t.id
          return (
            <button
              key={t.id}
              onClick={() => handleToolClick(t.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 scale-105'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          )
        })}

        <div className="w-6 h-px bg-slate-800 my-1" />

        {/* Preset Library Toggle */}
        <button
          onClick={toggleLibrary}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isLibraryOpen
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
          }`}
          title="Pick & Place Preset Library"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Assets Placeholder */}
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-colors"
          title="Assets & Components (Placeholder)"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom section: Layers Panel Toggle */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        <button
          onClick={toggleLayers}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isLayersOpen
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
          }`}
          title="Toggle Layers Panel"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
