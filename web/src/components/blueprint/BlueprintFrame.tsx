'use client'

import React, { useState } from 'react'
import { Square, Globe, Layers, Eye } from 'lucide-react'
import { useBlueprintStore, BlueprintFrameNode, BlueprintElementNode } from '@/store/blueprintStore'
import { BlueprintLiveFrame } from './BlueprintLiveFrame'

interface BlueprintFrameProps {
  frame: BlueprintFrameNode
}

export function BlueprintFrame({ frame }: BlueprintFrameProps) {
  const {
    selectedFrameId,
    setSelectedFrameId,
    selectedNodeId,
    setSelectedNodeId,
    activeTool
  } = useBlueprintStore()

  const [surfaceMode, setSurfaceMode] = useState<'live' | 'mock'>('live')

  const isFrameSelected = selectedFrameId === frame.id && !selectedNodeId

  const handleFrameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFrameId(frame.id)
    setSelectedNodeId(null)
  }

  return (
    <div
      onClick={handleFrameClick}
      className={`absolute transition-shadow rounded-2xl select-none group cursor-pointer overflow-hidden flex flex-col ${
        isFrameSelected
          ? 'ring-2 ring-cyan-400 shadow-2xl shadow-cyan-500/10'
          : 'ring-1 ring-slate-800 hover:ring-slate-700'
      }`}
      style={{
        left: `${frame.positionX}px`,
        top: `${frame.positionY}px`,
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        backgroundColor: '#0b101d'
      }}
    >
      {/* Frame Header Bar */}
      <div className="h-10 px-4 bg-[#0e1626] border-b border-slate-800/80 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Square className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">{frame.title}</span>
          <span className="text-[10px] font-mono text-slate-500">
            {frame.width}×{frame.height}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Surface Mode Toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSurfaceMode('live')
              }}
              className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                surfaceMode === 'live'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Live Page</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setSurfaceMode('mock')
              }}
              className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                surfaceMode === 'mock'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Mock Nodes</span>
            </button>
          </div>

          {frame.url && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span className="truncate max-w-[140px]">{frame.url}</span>
            </div>
          )}
        </div>
      </div>

      {/* Frame Body Surface */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {surfaceMode === 'live' ? (
          <BlueprintLiveFrame
            url={frame.url || 'https://example.com'}
            sessionId={frame.sessionId}
            width={frame.width}
            height={frame.height}
          />
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            {frame.elements.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <span>Empty Artboard</span>
                <span className="text-[11px] text-slate-600">Select a tool from left rail to insert elements</span>
              </div>
            ) : (
              frame.elements.map((node) => (
                <RenderNode
                  key={node.id}
                  node={node}
                  frameId={frame.id}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  setSelectedFrameId={setSelectedFrameId}
                  activeTool={activeTool}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Frame Selection Corners (Figma style) */}
      {isFrameSelected && (
        <>
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-cyan-400 border border-slate-950 rounded-sm" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-cyan-400 border border-slate-950 rounded-sm" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-cyan-400 border border-slate-950 rounded-sm" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-cyan-400 border border-slate-950 rounded-sm" />
        </>
      )}
    </div>
  )
}

function RenderNode({
  node,
  frameId,
  selectedNodeId,
  setSelectedNodeId,
  setSelectedFrameId,
  activeTool
}: {
  node: BlueprintElementNode
  frameId: string
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  setSelectedFrameId: (id: string | null) => void
  activeTool: string
}) {
  const isSelected = selectedNodeId === node.id

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFrameId(frameId)
    setSelectedNodeId(node.id)
  }

  // Convert node styles object to React Inline Style
  const styleObj: React.CSSProperties = {
    display: node.styles.display || 'block',
    flexDirection: (node.styles.flexDirection as any) || 'row',
    gap: node.styles.gap,
    padding: node.styles.padding,
    margin: node.styles.margin,
    color: node.styles.color,
    fontSize: node.styles.fontSize,
    fontWeight: node.styles.fontWeight,
    backgroundColor: node.styles.backgroundColor,
    borderRadius: node.styles.borderRadius,
    border: node.styles.border,
    boxShadow: node.styles.boxShadow,
    opacity: node.styles.opacity ? parseFloat(node.styles.opacity) : 1
  }

  return (
    <div
      onClick={handleClick}
      style={styleObj}
      className={`relative transition-all ${
        isSelected
          ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-purple-500/10'
          : 'hover:ring-1 hover:ring-purple-400/50 cursor-pointer'
      }`}
    >
      {/* Node label badge on select */}
      {isSelected && (
        <span className="absolute -top-5 left-0 px-1.5 py-0.5 bg-purple-500 text-slate-950 text-[9px] font-extrabold rounded tracking-wide shadow-sm">
          {node.name}
        </span>
      )}

      {node.type === 'text' ? (
        <span>{node.name}</span>
      ) : node.type === 'shape' ? (
        <div className="flex items-center justify-center font-medium text-xs">
          {node.name}
        </div>
      ) : (
        <>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {node.name}
          </div>
          {node.children && node.children.length > 0 && (
            <div className="space-y-4">
              {node.children.map((child) => (
                <RenderNode
                  key={child.id}
                  node={child}
                  frameId={frameId}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  setSelectedFrameId={setSelectedFrameId}
                  activeTool={activeTool}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
