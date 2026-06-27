export interface MarkerTriage {
  id: string
  priority: string
  ai_summary: string
}

export interface TriageResult {
  session_id: string
  triaged_markers: MarkerTriage[]
  triage_status: string
}

export interface SessionSummary {
  session_summary: string
  overall_health: string
  suggested_fix_order: string[]
  top_issues: string[]
  counts: {
    critical: number
    high: number
    medium: number
    low: number
  }
}
