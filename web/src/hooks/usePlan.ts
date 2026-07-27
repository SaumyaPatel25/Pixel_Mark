'use client'

import { useBillingStore } from '@/store/useBillingStore'
import { useAuthStore } from '@/store/authStore'
import { isPaidPlan, evaluateFeatureAccess, FeatureName, PlanCapabilities } from '@/lib/featureAccess'

export function usePlan() {
  const billing = useBillingStore()
  const user = useAuthStore((s) => s.user)

  const isPaid = isPaidPlan(billing.currentPlan, billing.subscriptionStatus)

  const caps: PlanCapabilities = {
    planType: (billing.currentPlan as any) || 'none',
    status: billing.subscriptionStatus || 'none',
    seatsAllowed: billing.seatsAllowed || 1,
    seatsUsed: billing.seatsUsed || 1,
    projectsAllowed: billing.projectsAllowed || 1,
    projectsUsed: billing.projectsUsed || 0,
    hasBlueprintDomEdit: Boolean(billing.hasBlueprintDomEdit && isPaid),
    canCreateProjects: billing.projectsUsed < billing.projectsAllowed,
    isEarlyBird: billing.isEarlyBird,
    isPaid,
    isTestMode: billing.isTestMode
  }

  const canAccess = (feature: FeatureName): boolean => {
    return evaluateFeatureAccess(feature, caps)
  }

  return {
    ...billing,
    capabilities: caps,
    isPaid,
    canAccess,
    user,
  }
}
