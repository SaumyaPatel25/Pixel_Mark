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

  // Actions
  fetchBillingStatus: (orgId?: string) => Promise<void>
  fetchEarlyBirdStatus: () => Promise<void>
  initiateCheckout: (planType: string, orgId?: string) => Promise<string | null>
  cancelSubscription: (orgId?: string) => Promise<void>
}

export const useBillingStore = create<BillingState>((set, get) => ({
  subscription: null,
  currentPlan: 'solopreneur',
  isEarlyBird: false,
  isTestMode: true,
  projectsAllowed: 5,
  projectsUsed: 0,
  seatsAllowed: 1,
  seatsUsed: 1,
  subscriptionStatus: 'active',
  hasBlueprintDomEdit: false,
  earlyBirdSlotsRemaining: 50,
  earlyBirdClaimedCount: 0,
  isLoading: false,

  fetchBillingStatus: async (orgId) => {
    set({ isLoading: true })
    try {
      const data: any = await api.billing.getBillingStatus(orgId)
      set({
        subscription: data.subscription,
        currentPlan: data.subscription.plan_type,
        isEarlyBird: data.is_early_bird,
        isTestMode: data.is_test_mode,
        projectsAllowed: data.subscription.projects_allowed,
        projectsUsed: data.projects_used,
        seatsAllowed: data.subscription.seats_allowed,
        seatsUsed: data.seats_used,
        subscriptionStatus: data.subscription.status,
        hasBlueprintDomEdit: data.has_blueprint_dom_edit,
        isLoading: false
      })
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
  }
}))
