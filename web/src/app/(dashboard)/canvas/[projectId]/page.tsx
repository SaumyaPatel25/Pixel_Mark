'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { BlueprintWorkspace } from '@/components/blueprint/BlueprintWorkspace'
import { StageLoader } from '@/components/ui/StageLoader'

export default function CanvasPage() {
  const params = useParams()
  const projectId =
    typeof params.projectId === 'string'
      ? params.projectId
      : Array.isArray(params.projectId)
      ? params.projectId[0]
      : ''

  if (!projectId) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#070a12]">
        <StageLoader size="md" text="Initializing Blueprint Workspace..." />
      </div>
    )
  }

  return <BlueprintWorkspace projectId={projectId} />
}
