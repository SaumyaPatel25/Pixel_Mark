export interface CopilotResolution {
  selector: string
  css_mutations: Record<string, any>
  css_rules: string
  text_mutation?: string | null
  client_summary: string
  developer_explanation: string
  confidence: number
}

export interface MicroDomCandidate {
  selector: string
  tag: string
  text?: string
  role?: string
  ariaLabel?: string
  classes?: string
  rect?: {
    top: number
    left: number
    width: number
    height: number
  }
}

export interface ElementCropResult {
  selector: string
  imageBase64: string | null
  rect?: {
    top: number
    left: number
    width: number
    height: number
    viewport_width?: number
    viewport_height?: number
  } | null
}

export type CopilotStatus = 'idle' | 'extracting' | 'analyzing' | 'applying' | 'error'

export interface SiteSuggestion {
  id: string
  title: string
  impact_tag: string
  selector: string
  description: string
  css_mutations: Record<string, any>
  css_rules: string
}

export interface SiteAnalysisResult {
  business_category: string
  aesthetic_summary: string
  dominant_colors: string[]
  top_3_suggestions: SiteSuggestion[]
}

export interface MutationHistoryItem {
  id: string
  selector: string
  cssRules: string
  textMutation?: string | null
  summary: string
}

export interface ActiveInspiration {
  imageUrl: string
  prompt: string
}

