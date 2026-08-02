export type PlanType = 'none' | 'free' | 'dev_team' | 'dev_team_early_bird' | 'enterprise';
export type FeatureName = 'blueprint_dom_edit' | 'create_project' | 'invite_teammates' | 'ai_triage';

export interface PlanCapabilities {
  planType: PlanType;
  plan_type: PlanType;
  status: string;
  seatsAllowed: number;
  seatsUsed: number;
  seats_allowed: number;
  seats_used: number;
  seats_remaining: number;
  projectsAllowed: number;
  projectsUsed: number;
  projects_allowed: number;
  projects_used: number;
  projects_remaining: number;
  hasBlueprintDomEdit: boolean;
  can_use_blueprint_dom: boolean;
  canCreateProjects: boolean;
  isEarlyBird: boolean;
  is_early_bird: boolean;
  isPaid: boolean;
  is_paid: boolean;
  isTestMode: boolean;
  role: string;
  is_billing_owner: boolean;
  org_name: string;
  is_past_due_warning: boolean;
  grace_period_ends_at: string | null;
}

export function isPaidPlan(planType?: string, status?: string): boolean {
  if (!planType || planType === 'none' || planType === 'free') return false;
  if (status && ['canceled', 'expired', 'none', 'incomplete'].includes(status)) return false;
  return ['dev_team', 'dev_team_early_bird', 'enterprise'].includes(planType);
}

export function evaluateFeatureAccess(feature: FeatureName, caps: PlanCapabilities): boolean {
  switch (feature) {
    case 'blueprint_dom_edit':
      return caps.hasBlueprintDomEdit && caps.isPaid;
    case 'create_project':
      return caps.canCreateProjects;
    case 'invite_teammates':
      return caps.isPaid && caps.seatsUsed < caps.seatsAllowed;
    case 'ai_triage':
      return caps.isPaid;
    default:
      return true;
  }
}
