'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Square, Layout, Type, Shapes, Layers as LayersIcon, X } from 'lucide-react'
import { useBlueprintStore, BlueprintFrameNode, BlueprintElementNode } from '@/store/blueprintStore'

export function BlueprintLayersPanel() {
  const {
    frames,
    selectedFrameId,
    setSelectedFrameId,
    selectedNodeId,
    setSelectedNodeId,
    isLayersOpen,
    toggleLayers
  } = useBlueprintStore()

  if (!isLayersOpen) return null

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-cyan-950/60 flex flex-col text-slate-200 select-none z-10 shrink-0">
      {/* Header */}
      <div className="h-10 px-3.5 border-b border-cyan-950/50 flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#090d16]">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Layers</span>
        </div>
        <button
          onClick={toggleLayers}
          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
          title="Close Layers"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layer Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {frames.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 italic">No frames on canvas</div>
        ) : (
          frames.map((frame) => (
            <FrameItem
              key={frame.id}
              frame={frame}
              selectedFrameId={selectedFrameId}
              setSelectedFrameId={setSelectedFrameId}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function FrameItem({
  frame,
  selectedFrameId,
  setSelectedFrameId,
  selectedNodeId,
  setSelectedNodeId
}: {
  frame: BlueprintFrameNode
  selectedFrameId: string | null
  setSelectedFrameId: (id: string | null) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedFrameId === frame.id && !selectedNodeId

  const handleSelectFrame = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFrameId(frame.id)
    setSelectedNodeId(null)
  }

  return (
    <div className="space-y-0.5">
      <div
        onClick={handleSelectFrame}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
          isSelected
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            : 'text-slate-300 hover:bg-slate-800/60'
        }`}
      >
        {frame.elements.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-3.5" />
        )}
        <Square className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="truncate flex-1">{frame.title}</span>
      </div>

      {/* Children element nodes */}
      {expanded && frame.elements.length > 0 && (
        <div className="pl-4 space-y-0.5">
          {frame.elements.map((node) => (
            <NodeItem
              key={node.id}
              node={node}
              frameId={frame.id}
              selectedFrameId={selectedFrameId}
              setSelectedFrameId={setSelectedFrameId}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NodeItem({
  node,
  frameId,
  selectedFrameId,
  setSelectedFrameId,
  selectedNodeId,
  setSelectedNodeId
}: {
  node: BlueprintElementNode
  frameId: string
  selectedFrameId: string | null
  setSelectedFrameId: (id: string | null) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedFrameId === frameId && selectedNodeId === node.id

  const handleSelectNode = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFrameId(frameId)
    setSelectedNodeId(node.id)
  }

  const getIcon = () => {
    switch (node.type) {
      case 'section':
        return <Layout className="w-3.5 h-3.5 text-purple-400 shrink-0" />
      case 'text':
        return <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      case 'shape':
      default:
        return <Shapes className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    }
  }

  return (
    <div className="space-y-0.5">
      <div
        onClick={handleSelectNode}
        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${
          isSelected
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
        }`}
      >
        {node.children && node.children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="text-slate-500 hover:text-white"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-3.5" />
        )}
        {getIcon()}
        <span className="truncate flex-1">{node.name}</span>
      </div>

      {expanded && node.children && node.children.length > 0 && (
        <div className="pl-4 space-y-0.5">
          {node.children.map((child) => (
            <NodeItem
              key={child.id}
              node={child}
              frameId={frameId}
              selectedFrameId={selectedFrameId}
              setSelectedFrameId={setSelectedFrameId}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
