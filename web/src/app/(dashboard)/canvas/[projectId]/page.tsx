'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Canvas } from '@/components/canvas/Canvas'
import { ArrowLeft, Monitor } from 'lucide-react'

export default function CanvasPage() {
  const params = useParams()
  const projectId = typeof params.projectId === 'string' ? params.projectId : Array.isArray(params.projectId) ? params.projectId[0] : ''
  const router = useRouter()

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0a0a0f] text-white">
      {/* Premium Minimalist Top bar */}
      <header className="h-14 bg-[#0d0d14] border-b border-white/5 flex items-center justify-between px-6 z-30 select-none flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-all font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          
          <div className="h-4 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-black uppercase tracking-widest text-white/80">
              Interactive Blueprint Canvas
            </span>
          </div>
        </div>

        {/* Short Key Interaction hints */}
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono tracking-widest text-white/20 uppercase">
          <span>Scroll to Zoom</span>
          <span>•</span>
          <span>Drag to Pan</span>
          <span>•</span>
          <span>Click to Triage</span>
        </div>
      </header>

      {/* Full scale transformable Canvas surface */}
      <div className="flex-1 min-h-0 relative">
        {projectId ? (
          <Canvas projectId={projectId} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-2 opacity-30">
            <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-mono tracking-widest uppercase">Initializing Blueprint Canvas...</span>
          </div>
        )}
      </div>
    </div>
  )
}
