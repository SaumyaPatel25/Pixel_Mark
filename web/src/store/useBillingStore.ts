import { create } from 'zustand'
import { api } from '@/lib/api'

export interface SubscriptionInfo {
  id: string
  org_id: string
  dodo_customer_id?: string
  dodo_subscription_id?: string
  plan_type: string
  status: string
  is_test_mode: boolean
  current_period_end?: string
  seats_allowed: number
  projects_allowed: number
  created_at: string
  updated_at: string
}

interface BillingState {
  subscription: SubscriptionInfo | null
  currentPlan: string
  isPaid: boolean
  canCreateProjects: boolean
  isEarlyBird: boolean
  isTestMode: boolean
  projectsAllowed: number
  projectsUsed: number
  seatsAllowed: number
  seatsUsed: number
  subscriptionStatus: string
  hasBlueprintDomEdit: boolean
  earlyBirdSlotsRemaining: number
  earlyBirdClaimedCount: number
  isLoading: boolean
  hasHydrated: boolean
  role: string
  is_billing_owner: boolean
  org_name: string
  isPastDueWarning: boolean
  gracePeriodEndsAt: string | null

  // Actions
  fetchBillingStatus: (orgId?: string) => Promise<void>
  fetchEarlyBirdStatus: () => Promise<void>
  initiateCheckout: (planType: string, orgId?: string) => Promise<string | null>
  cancelSubscription: (orgId?: string) => Promise<void>
  syncCheckout: (data: { org_id?: string; subscription_id?: string; plan_type?: string }) => Promise<any>
}

export const useBillingStore = create<BillingState>((set, get) => ({
  subscription: null,
  currentPlan: 'none',
  isPaid: false,
  canCreateProjects: true,
  isEarlyBird: false,
  isTestMode: true,
  projectsAllowed: 1,
  projectsUsed: 0,
  seatsAllowed: 1,
  seatsUsed: 1,
  subscriptionStatus: 'none',
  hasBlueprintDomEdit: false,
  earlyBirdSlotsRemaining: 50,
  earlyBirdClaimedCount: 0,
  isLoading: false,
  hasHydrated: false,
  role: 'member',
  is_billing_owner: false,
  org_name: '',
  isPastDueWarning: false,
  gracePeriodEndsAt: null,

  fetchBillingStatus: async (orgId) => {
    set({ isLoading: true })
    try {
      let data: any
      try {
        data = await api.billing.getEntitlements()
        set({
          subscription: data.subscription || null,
          currentPlan: data.plan_type || 'none',
          isPaid: Boolean(data.is_paid),
          canCreateProjects: Boolean(data.projects_used < data.projects_allowed),
          isEarlyBird: Boolean(data.is_early_bird),
          isTestMode: Boolean(data.is_test_mode ?? true),
          projectsAllowed: data.projects_allowed ?? 1,
          projectsUsed: data.projects_used ?? 0,
          seatsAllowed: data.seats_allowed ?? 1,
          seatsUsed: data.seats_used ?? 1,
          subscriptionStatus: data.status || 'none',
          hasBlueprintDomEdit: Boolean(data.can_use_blueprint_dom),
          isLoading: false,
          hasHydrated: true,
          role: data.role || 'member',
          is_billing_owner: Boolean(data.is_billing_owner),
          org_name: data.org_name || '',
          isPastDueWarning: Boolean(data.is_past_due_warning),
          gracePeriodEndsAt: data.grace_period_ends_at || null
        })
      } catch {
        // Fallback to getBillingStatus
        data = await api.billing.getBillingStatus(orgId)
        const isPaid = ['dev_team', 'dev_team_early_bird', 'enterprise'].includes(data.subscription?.plan_type) && data.subscription?.status === 'active'
        set({
          subscription: data.subscription,
          currentPlan: data.subscription?.plan_type || 'none',
          isPaid,
          canCreateProjects: Boolean(data.projects_used < (data.subscription?.projects_allowed || 1)),
          isEarlyBird: Boolean(data.is_early_bird),
          isTestMode: Boolean(data.is_test_mode),
          projectsAllowed: data.subscription?.projects_allowed || 1,
          projectsUsed: data.projects_used || 0,
          seatsAllowed: data.subscription?.seats_allowed || 1,
          seatsUsed: data.seats_used || 1,
          subscriptionStatus: data.subscription?.status || 'none',
          hasBlueprintDomEdit: Boolean(data.has_blueprint_dom_edit),
          isLoading: false,
          hasHydrated: true,
          role: data.role || 'member',
          is_billing_owner: Boolean(data.is_billing_owner),
          org_name: data.org_name || '',
          isPastDueWarning: Boolean(data.is_past_due_warning),
          gracePeriodEndsAt: data.grace_period_ends_at || null
        })
      }
    } catch (err) {
      console.error('[STAGE Billing] Fetch status error:', err)
      set({ isLoading: false })
    }
  },

  fetchEarlyBirdStatus: async () => {
    try {
      const data: any = await api.billing.getEarlyBirdStatus()
      set({
        earlyBirdSlotsRemaining: data.slots_remaining,
        earlyBirdClaimedCount: data.claimed_count
      })
    } catch (err) {
      console.error('[STAGE Billing] Fetch early bird error:', err)
    }
  },

  initiateCheckout: async (planType, orgId) => {
    try {
      const res: any = await api.billing.createCheckout({ plan_type: planType, org_id: orgId })
      if (res && res.checkout_url) {
        return res.checkout_url
      }
      return null
    } catch (err: any) {
      console.error('[STAGE Billing] Initiate checkout error:', err)
      throw err
    }
  },

  cancelSubscription: async (orgId) => {
    try {
      await api.billing.cancelSubscription(orgId)
      await get().fetchBillingStatus(orgId)
    } catch (err) {
      console.error('[STAGE Billing] Cancel subscription error:', err)
    }
  },

  syncCheckout: async (data) => {
    try {
      const result: any = await api.billing.syncCheckout(data)
      if (result?.is_paid !== undefined) {
        set({
          subscription: result.subscription || null,
          currentPlan: result.plan_type || 'none',
          isPaid: Boolean(result.is_paid),
          canCreateProjects: result.projects_used < result.projects_allowed,
          isEarlyBird: Boolean(result.is_early_bird),
          isTestMode: Boolean(result.is_test_mode ?? true),
          projectsAllowed: result.projects_allowed ?? 1,
          projectsUsed: result.projects_used ?? 0,
          seatsAllowed: result.seats_allowed ?? 1,
          seatsUsed: result.seats_used ?? 1,
          subscriptionStatus: result.status || 'none',
          hasBlueprintDomEdit: Boolean(result.can_use_blueprint_dom),
          hasHydrated: true,
          role: result.role || 'member',
          is_billing_owner: Boolean(result.is_billing_owner),
          org_name: result.org_name || '',
          isPastDueWarning: Boolean(result.is_past_due_warning),
          gracePeriodEndsAt: result.grace_period_ends_at || null
        })
      }
      return result
    } catch (err) {
      console.warn('[STAGE Billing] syncCheckout store error:', err)
      throw err
    }
  }
}))
