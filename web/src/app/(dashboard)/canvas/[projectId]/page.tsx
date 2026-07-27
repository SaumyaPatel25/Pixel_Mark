'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { BlueprintWorkspace } from '@/components/blueprint/BlueprintWorkspace'
import { StageLoader } from '@/components/ui/StageLoader'
import { FeatureGate } from '@/components/auth/FeatureGate'
import { LockedDomModal } from '@/components/blueprint/LockedDomModal'

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
      <div className="w-full h-screen flex flex-col items-center justify-center bg-pm-bg">
        <StageLoader size="md" text="Initializing Blueprint Workspace..." />
      </div>
    )
  }

  return (
    <FeatureGate feature="blueprint_dom_edit" fallback={<LockedDomModal />}>
      <BlueprintWorkspace projectId={projectId} />
    </FeatureGate>
  )
}
