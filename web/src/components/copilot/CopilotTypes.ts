export interface CopilotResolution {
  selector: string
  css_mutations: Record<string, any>
  css_rules: string
  text_mutation?: string | null
  client_summary: string
  developer_explanation: string
  developer_directive?: string | null
  benchmark_name?: string | null
  benchmark_url?: string | null
  benchmark_pattern?: string | null
  developer_code_spec?: string | null
  rect?: {
    top: number
    left: number
    width: number
    height: number
  } | null
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
  developer_directive?: string
  source_platform?: string
  benchmark_name?: string
  benchmark_url?: string
  benchmark_pattern?: string
  developer_code_spec?: string
  theme_colors?: string[]
  rect?: {
    top: number
    left: number
    width: number
    height: number
  } | null
}

export interface FocusedElement {
  selector: string
  tag?: string
  text?: string
  source?: 'circle' | 'pin' | 'click'
  rect?: {
    top: number
    left: number
    width: number
    height: number
    scroll_x?: number
    scroll_y?: number
  } | null
}

export interface SiteAnalysisResult {
  business_category: string
  aesthetic_summary: string
  dominant_colors: string[]
  top_3_suggestions: SiteSuggestion[]
  focusContext?: FocusedElement | null
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

