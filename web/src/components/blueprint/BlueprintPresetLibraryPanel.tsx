'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Type,
  AlignLeft,
  MousePointerClick,
  Square,
  LayoutGrid,
  Quote,
  Columns,
  Image as ImageIcon,
  Check,
  Target,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  RefreshCw,
  X
} from 'lucide-react'
import { useBlueprintStore, InsertionMode } from '@/store/blueprintStore'
import { PRESET_LIBRARY, PresetItem } from './BlueprintPresetLibrary'

export function BlueprintPresetLibraryPanel() {
  const {
    isLibraryOpen,
    toggleLibrary,
    selectedTarget,
    selectedPresetId,
    setSelectedPresetId,
    insertionMode,
    setInsertionMode,
    addMutation
  } = useBlueprintStore()

  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  if (!isLibraryOpen) return null

  const categories = ['All', 'Typography', 'Buttons', 'Cards', 'Sections', 'Media']

  const filteredPresets = PRESET_LIBRARY.filter((p) =>
    activeCategory === 'All' ? true : p.category === activeCategory
  )

  const selectedPreset = PRESET_LIBRARY.find((p) => p.id === selectedPresetId)

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Type':
        return <Type className="w-4 h-4 text-cyan-400" />
      case 'AlignLeft':
        return <AlignLeft className="w-4 h-4 text-cyan-400" />
      case 'MousePointerClick':
        return <MousePointerClick className="w-4 h-4 text-emerald-400" />
      case 'Square':
        return <Square className="w-4 h-4 text-slate-300" />
      case 'LayoutCard':
      case 'LayoutGrid':
        return <LayoutGrid className="w-4 h-4 text-purple-400" />
      case 'Quote':
        return <Quote className="w-4 h-4 text-amber-400" />
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-indigo-400" />
      case 'Columns':
        return <Columns className="w-4 h-4 text-blue-400" />
      case 'Image':
      default:
        return <ImageIcon className="w-4 h-4 text-rose-400" />
    }
  }

  const handleApplyPreset = (action: InsertionMode) => {
    if (!selectedPreset) return
    if (!selectedTarget) return

    addMutation({
      targetSelector: selectedTarget.selector,
      actionType: action,
      presetId: selectedPreset.id,
      presetName: selectedPreset.name,
      htmlPayload: selectedPreset.htmlTemplate
    })

    setSuccessNotice(`Applied "${selectedPreset.name}" (${action})`)
    setTimeout(() => setSuccessNotice(null), 3000)
  }

  // Capability logic
  const isInlineTag = selectedTarget && ['span', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'b', 'i', 'strong'].includes(selectedTarget.tag.toLowerCase())
  const canInsertInside = selectedTarget ? !isInlineTag : true

  return (
    <div className="w-80 bg-[#0d1322] border-r border-cyan-950/60 flex flex-col text-slate-200 select-none z-10 shrink-0 shadow-2xl">
      {/* Header */}
      <div className="h-10 px-4 border-b border-cyan-950/50 flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#090d16]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pick & Place Library</span>
        </div>
        <button
          onClick={toggleLibrary}
          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
          title="Close Library"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target Status Banner */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs">
        {selectedTarget ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="font-mono text-cyan-400 font-bold uppercase">{selectedTarget.tag}</span>
                <span className="text-slate-400 text-[11px] font-mono ml-1.5 truncate">
                  {selectedTarget.selector}
                </span>
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold shrink-0">
              Targeted
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400 text-[11px]">
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>Click an element in DOM Edit mode to pick target</span>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{successNotice}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="p-2 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Presets List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.id
          return (
            <div
              key={preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id)
                if (selectedTarget) {
                  addMutation({
                    targetSelector: selectedTarget.selector,
                    actionType: insertionMode,
                    presetId: preset.id,
                    presetName: preset.name,
                    htmlPayload: preset.htmlTemplate
                  })
                  setSuccessNotice(`Applied "${preset.name}" (${insertionMode})`)
                  setTimeout(() => setSuccessNotice(null), 3000)
                }
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                  {getIconComponent(preset.iconName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-100 truncate">{preset.name}</h5>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">{preset.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">{preset.previewText}</p>
                </div>
              </div>

              {/* Action Buttons inside selected preset */}
              {isSelected && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Choose Insertion Action:
                  </span>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplyPreset('replace')
                      }}
                      disabled={!selectedTarget}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold transition-all"
                      title="Replace selected element"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplyPreset('before')
                      }}
                      disabled={!selectedTarget}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-[11px] font-semibold transition-all"
                      title="Insert before selected element"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>Before</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplyPreset('after')
                      }}
                      disabled={!selectedTarget}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-[11px] font-semibold transition-all"
                      title="Insert after selected element"
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span>After</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplyPreset('inside')
                      }}
                      disabled={!selectedTarget || !canInsertInside}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold border border-purple-500/30 transition-all"
                      title={canInsertInside ? 'Insert inside container' : 'Cannot insert inside text/inline tag'}
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Inside</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
