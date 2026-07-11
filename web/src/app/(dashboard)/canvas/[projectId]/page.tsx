'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PixelmarkLoader } from '@/components/ui/PixelmarkLoader'

const Canvas = dynamic(
  () => import('@/components/canvas/Canvas').then((mod) => mod.Canvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f]">
        <PixelmarkLoader size="md" text="Initializing Blueprint Canvas..." />
      </div>
    )
  }
)

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
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f]">
          <PixelmarkLoader size="md" text="Initializing Blueprint Canvas..." />
        </div>
      )}
    </div>
  )
}
