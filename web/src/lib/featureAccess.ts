export type PlanType = 'none' | 'free' | 'dev_team' | 'dev_team_early_bird' | 'enterprise';
export type FeatureName = 'blueprint_dom_edit' | 'create_project' | 'invite_teammates' | 'ai_triage';

export interface PlanCapabilities {
  planType: PlanType;
  status: string;
  seatsAllowed: number;
  seatsUsed: number;
  projectsAllowed: number;
  projectsUsed: number;
  hasBlueprintDomEdit: boolean;
  canCreateProjects: boolean;
  isEarlyBird: boolean;
  isPaid: boolean;
  isTestMode: boolean;
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
