'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface PlanCapabilitiesData {
  org_id: string
  plan_type: string
  status: string
  seats_allowed: number
  projects_allowed: number
  has_blueprint_dom_edit: boolean
  is_early_bird: boolean
  is_past_due_warning: boolean
  grace_period_ends_at: string | null
  projects_used: number
  seats_used: number
  projects_remaining: number
  seats_remaining: number
  can_create_projects: boolean
}

export function usePlan(orgId?: string) {
  const [plan, setPlan] = useState<PlanCapabilitiesData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.billing.getPlanCapabilities(orgId)
      setPlan(data)
      setError(null)
    } catch (err: any) {
      console.error('[STAGE Plan Hook] Error fetching plan capabilities:', err)
      setError(err?.message || 'Failed to fetch plan capabilities')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  const planType = plan?.plan_type || 'none'
  const status = plan?.status || 'none'
  const isEarlyBird = Boolean(plan?.is_early_bird)
  const isDevTeam = planType === 'dev_team' || planType === 'dev_team_early_bird' || planType === 'enterprise'
  const isSolopreneur = false
  const hasNoSubscription = planType === 'none' || status === 'none' || status === 'canceled' || status === 'expired'
  const canUseBlueprintDomEdit = Boolean(plan?.has_blueprint_dom_edit)
  const projectsRemaining = plan?.projects_remaining ?? 0
  const seatsRemaining = plan?.seats_remaining ?? 0
  const isPastDueWarning = Boolean(plan?.is_past_due_warning)

  return {
    plan,
    loading,
    error,
    refreshPlan: fetchPlan,
    planType,
    status,
    isEarlyBird,
    isDevTeam,
    isSolopreneur,
    hasNoSubscription,
    canUseBlueprintDomEdit,
    projectsRemaining,
    seatsRemaining,
    isPastDueWarning,
    gracePeriodEndsAt: plan?.grace_period_ends_at || null,
  }
}
