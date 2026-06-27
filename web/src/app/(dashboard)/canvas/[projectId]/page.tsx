'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Canvas } from '@/components/canvas/Canvas'

export default function CanvasPage() {
  const params = useParams()
  const projectId = typeof params.projectId === 'string' 
    ? params.projectId 
    : Array.isArray(params.projectId) 
    ? params.projectId[0] 
    : ''

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0a0a0f] text-white">
      {projectId ? (
        <Canvas projectId={projectId} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center space-y-2 opacity-30 bg-[#0a0a0f]">
          <span className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-mono tracking-widest uppercase">Initializing Blueprint Canvas...</span>
        </div>
      )}
    </div>
  )
}
