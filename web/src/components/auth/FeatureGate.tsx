'use client'

import React, { useEffect } from 'react'
import { usePlan } from '@/hooks/usePlan'
import { useBillingStore } from '@/store/useBillingStore'
import { FeatureName } from '@/lib/featureAccess'

interface FeatureGateProps {
  feature: FeatureName
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { canAccess } = usePlan()
  const isLoading = useBillingStore((s) => s.isLoading)
  const hasHydrated = useBillingStore((s) => s.hasHydrated)
  const fetchBillingStatus = useBillingStore((s) => s.fetchBillingStatus)

  // Self-fetch billing if this gate mounts on a page that doesn't fetch billing itself
  // (e.g. /canvas/[projectId] has no billing fetch — it relies on this gate to hydrate)
  useEffect(() => {
    if (!hasHydrated && !isLoading) {
      fetchBillingStatus()
    }
  }, [hasHydrated, isLoading, fetchBillingStatus])

  // Block render until billing data has been fetched at least once.
  // This prevents evaluating the gate against stale Zustand defaults
  // (hasBlueprintDomEdit=false, isPaid=false) before the API responds.
  if (!hasHydrated || isLoading) {
    return null
  }

  if (!canAccess(feature)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
