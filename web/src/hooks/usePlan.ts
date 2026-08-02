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
    plan_type: (billing.currentPlan as any) || 'none',
    status: billing.subscriptionStatus || 'none',
    seatsAllowed: billing.seatsAllowed || 1,
    seatsUsed: billing.seatsUsed || 1,
    seats_allowed: billing.seatsAllowed || 1,
    seats_used: billing.seatsUsed || 1,
    seats_remaining: Math.max(0, (billing.seatsAllowed || 1) - (billing.seatsUsed || 1)),
    projectsAllowed: billing.projectsAllowed || 1,
    projectsUsed: billing.projectsUsed || 0,
    projects_allowed: billing.projectsAllowed || 1,
    projects_used: billing.projectsUsed || 0,
    projects_remaining: Math.max(0, (billing.projectsAllowed || 1) - (billing.projectsUsed || 0)),
    hasBlueprintDomEdit: Boolean(billing.hasBlueprintDomEdit && isPaid),
    can_use_blueprint_dom: Boolean(billing.hasBlueprintDomEdit && isPaid),
    canCreateProjects: billing.projectsUsed < billing.projectsAllowed,
    isEarlyBird: billing.isEarlyBird,
    is_early_bird: billing.isEarlyBird,
    isPaid,
    is_paid: isPaid,
    isTestMode: billing.isTestMode,
    role: billing.role || 'member',
    is_billing_owner: billing.is_billing_owner || false,
    org_name: billing.org_name || '',
    is_past_due_warning: billing.isPastDueWarning || false,
    grace_period_ends_at: billing.gracePeriodEndsAt || null
  }

  const canAccess = (feature: FeatureName): boolean => {
    return evaluateFeatureAccess(feature, caps)
  }

  return {
    ...billing,
    capabilities: caps,
    isPaid,
    isLoading: billing.isLoading,
    hasHydrated: billing.hasHydrated,
    canAccess,
    canUseBlueprintDomEdit: canAccess('blueprint_dom_edit'),
    user,
  }
}
