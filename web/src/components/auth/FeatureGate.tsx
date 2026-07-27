'use client'

import React from 'react'
import { usePlan } from '@/hooks/usePlan'
import { FeatureName } from '@/lib/featureAccess'

interface FeatureGateProps {
  feature: FeatureName
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { canAccess, isLoading } = usePlan()

  if (isLoading) {
    return null
  }

  if (!canAccess(feature)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
