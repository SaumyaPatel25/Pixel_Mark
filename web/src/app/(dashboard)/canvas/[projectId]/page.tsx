'use client'

import React, { useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { BlueprintWorkspace } from '@/components/blueprint/BlueprintWorkspace'
import { StageLoader } from '@/components/ui/StageLoader'
import { FeatureGate } from '@/components/auth/FeatureGate'

function RedirectToPricing() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/pricing')
  }, [router])
  return null
}

function CanvasPageContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') || undefined

  return (
    <FeatureGate feature="blueprint_dom_edit" fallback={<RedirectToPricing />}>
      <BlueprintWorkspace projectId={projectId} sessionId={sessionId} />
    </FeatureGate>
  )
}

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
    <Suspense fallback={
      <div className="w-full h-screen flex flex-col items-center justify-center bg-pm-bg">
        <StageLoader size="md" text="Loading Canvas Workspace..." />
      </div>
    }>
      <CanvasPageContent projectId={projectId} />
    </Suspense>
  )
}
