import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SiteSuggestion,
  SiteAnalysisResult,
  MutationHistoryItem,
  ActiveInspiration,
  CopilotResolution,
} from '@/components/copilot/CopilotTypes'

describe('STAGE Copilot V2 Features: Site DNA, History Stack, Suggestions & Inspo', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. Site Analysis Status Transitions & Contracts ─────────────────────
  describe('Site Analysis DNA & Heuristic Contract', () => {
    it('validates SiteAnalysisResult and SiteSuggestion schemas', () => {
      const mockSuggestions: SiteSuggestion[] = [
        {
          id: 'sugg-cro-1',
          title: 'Boost CTA Contrast & Size',
          impact_tag: 'Conversion',
          selector: 'button.cta-primary',
          description: 'Increase button padding, add high-contrast emerald background and subtle drop shadow.',
          css_mutations: {
            'background-color': '#10b981',
            'padding': '14px 28px',
            'box-shadow': '0 4px 14px rgba(16, 185, 129, 0.4)',
          },
          css_rules: 'button.cta-primary { background-color: #10b981 !important; padding: 14px 28px !important; }',
        },
        {
          id: 'sugg-typo-2',
          title: 'Improve Headline Readability',
          impact_tag: 'Readability',
          selector: 'h1.hero-title',
          description: 'Improve optical contrast and adjust line height for readability across dark background.',
          css_mutations: {
            'color': '#f8fafc',
            'line-height': '1.2',
            'letter-spacing': '-0.02em',
          },
          css_rules: 'h1.hero-title { color: #f8fafc !important; line-height: 1.2 !important; }',
        },
        {
          id: 'sugg-rhythm-3',
          title: 'Refine Feature Card Spacing Rhythm',
          impact_tag: 'Visual Polish',
          selector: '.feature-card-grid',
          description: 'Harmonize grid gap and card internal breathing room with standard 8px grid.',
          css_mutations: {
            'gap': '24px',
            'padding': '32px',
          },
          css_rules: '.feature-card-grid { gap: 24px !important; padding: 32px !important; }',
        },
      ]

      const analysis: SiteAnalysisResult = {
        business_category: 'SaaS / DevTools',
        aesthetic_summary: 'Dark mode cyber-minimal with high contrast accents',
        dominant_colors: ['#09090b', '#8b5cf6', '#10b981', '#ffffff'],
        top_3_suggestions: mockSuggestions,
      }

      expect(analysis.business_category).toBe('SaaS / DevTools')
      expect(analysis.top_3_suggestions).toHaveLength(3)
      expect(analysis.top_3_suggestions[0].impact_tag).toBe('Conversion')
      expect(analysis.top_3_suggestions[1].impact_tag).toBe('Readability')
      expect(analysis.top_3_suggestions[2].impact_tag).toBe('Visual Polish')
      expect(analysis.top_3_suggestions[0].css_rules).toContain('!important')
    })

    it('simulates site analysis state machine and submission guard during background analysis', () => {
      type AnalysisState = 'idle' | 'analyzing' | 'ready'
      let state: AnalysisState = 'idle'
      let analysisResult: SiteAnalysisResult | null = null

      const canSubmitPrompt = (currentState: AnalysisState): { allowed: boolean; error?: string } => {
        if (currentState === 'analyzing') {
          return {
            allowed: false,
            error: '✨ Analyzing site with AI in background... Please wait a moment.',
          }
        }
        return { allowed: true }
      }

      // Initial idle state
      expect(canSubmitPrompt(state).allowed).toBe(true)

      // Iframe posts STAGE_SITE_FINGERPRINT_RESULT -> transition to analyzing
      state = 'analyzing'
      const guardResult = canSubmitPrompt(state)
      expect(guardResult.allowed).toBe(false)
      expect(guardResult.error).toBe('✨ Analyzing site with AI in background... Please wait a moment.')

      // Analysis resolves
      analysisResult = {
        business_category: 'Fintech Platform',
        aesthetic_summary: 'Clean modern financial dashboard',
        dominant_colors: ['#0f172a', '#3b82f6'],
        top_3_suggestions: [],
      }
      state = 'ready'

      expect(canSubmitPrompt(state).allowed).toBe(true)
      expect(state).toBe('ready')
      expect(analysisResult.business_category).toBe('Fintech Platform')
    })
  })

  // ─── 2. Mutation History Stack (Push, Undo, Redo) ─────────────────────────
  describe('Mutation History Stack Manager', () => {
    class HistoryManager {
      history: MutationHistoryItem[] = []
      index: number = -1

      push(item: MutationHistoryItem) {
        // Truncate any redo future before pushing new mutation
        this.history = this.history.slice(0, this.index + 1).concat(item)
        this.index = this.history.length - 1
      }

      canUndo(): boolean {
        return this.index >= 0
      }

      canRedo(): boolean {
        return this.index < this.history.length - 1
      }

      undo(): { action: 'revert' | 'apply'; item: MutationHistoryItem } | null {
        if (!this.canUndo()) return null
        const currentItem = this.history[this.index]

        if (this.index === 0) {
          this.index = -1
          return { action: 'revert', item: currentItem }
        } else {
          this.index = this.index - 1
          const prevItem = this.history[this.index]
          return { action: 'apply', item: prevItem }
        }
      }

      redo(): { action: 'apply'; item: MutationHistoryItem } | null {
        if (!this.canRedo()) return null
        this.index = this.index + 1
        return { action: 'apply', item: this.history[this.index] }
      }
    }

    it('handles push, undo, and redo transitions through full stack lifecycle', () => {
      const manager = new HistoryManager()

      expect(manager.canUndo()).toBe(false)
      expect(manager.canRedo()).toBe(false)

      const m1: MutationHistoryItem = {
        id: 'mut-1',
        selector: '.header',
        cssRules: '.header { background: #000; }',
        summary: 'Dark header',
      }
      manager.push(m1)

      expect(manager.index).toBe(0)
      expect(manager.canUndo()).toBe(true)
      expect(manager.canRedo()).toBe(false)

      const m2: MutationHistoryItem = {
        id: 'mut-2',
        selector: '.btn-cta',
        cssRules: '.btn-cta { background: #10b981; }',
        summary: 'Emerald CTA button',
      }
      manager.push(m2)

      expect(manager.index).toBe(1)
      expect(manager.canUndo()).toBe(true)
      expect(manager.canRedo()).toBe(false)

      // First Undo: steps from m2 back to m1
      const undo1 = manager.undo()
      expect(undo1).not.toBeNull()
      expect(undo1?.action).toBe('apply')
      expect(undo1?.item.id).toBe('mut-1')
      expect(manager.index).toBe(0)
      expect(manager.canUndo()).toBe(true)
      expect(manager.canRedo()).toBe(true)

      // Second Undo: steps from m1 back to initial state (revert)
      const undo2 = manager.undo()
      expect(undo2).not.toBeNull()
      expect(undo2?.action).toBe('revert')
      expect(undo2?.item.id).toBe('mut-1')
      expect(manager.index).toBe(-1)
      expect(manager.canUndo()).toBe(false)
      expect(manager.canRedo()).toBe(true)

      // Boundary check: cannot undo below -1
      expect(manager.undo()).toBeNull()

      // First Redo: re-applies m1
      const redo1 = manager.redo()
      expect(redo1).not.toBeNull()
      expect(redo1?.action).toBe('apply')
      expect(redo1?.item.id).toBe('mut-1')
      expect(manager.index).toBe(0)

      // Second Redo: re-applies m2
      const redo2 = manager.redo()
      expect(redo2).not.toBeNull()
      expect(redo2?.action).toBe('apply')
      expect(redo2?.item.id).toBe('mut-2')
      expect(manager.index).toBe(1)
      expect(manager.canRedo()).toBe(false)

      // Boundary check: cannot redo beyond end of history
      expect(manager.redo()).toBeNull()
    })

    it('truncates redo history when new mutation is pushed after undo', () => {
      const manager = new HistoryManager()

      manager.push({ id: 'm1', selector: '.a', cssRules: 'color: red', summary: 'Red' })
      manager.push({ id: 'm2', selector: '.b', cssRules: 'color: blue', summary: 'Blue' })
      expect(manager.history).toHaveLength(2)

      manager.undo() // back to m1 at index 0
      expect(manager.index).toBe(0)

      const m3: MutationHistoryItem = { id: 'm3', selector: '.c', cssRules: 'color: green', summary: 'Green' }
      manager.push(m3)

      expect(manager.history).toHaveLength(2)
      expect(manager.history[0].id).toBe('m1')
      expect(manager.history[1].id).toBe('m3')
      expect(manager.index).toBe(1)
      expect(manager.canRedo()).toBe(false)
    })
  })

  // ─── 3. Suggestions Modal Actions & Payloads ──────────────────────────────
  describe('Copilot Suggestions Modal Contract', () => {
    it('prepares proper preview payload and confirm-pin payload for a suggestion', () => {
      const suggestion: SiteSuggestion = {
        id: 'sugg-101',
        title: 'High Contrast Primary Button',
        impact_tag: 'Conversion',
        selector: '#hero-cta',
        description: 'Applied electric violet gradient with prominent hover scale.',
        css_mutations: {
          'background': 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          'transform': 'scale(1.05)',
        },
        css_rules: '#hero-cta { background: linear-gradient(135deg, #8b5cf6, #6366f1) !important; }',
      }

      // Live ephemeral preview payload
      const previewPayload: CopilotResolution = {
        selector: suggestion.selector,
        css_mutations: suggestion.css_mutations,
        css_rules: suggestion.css_rules,
        text_mutation: null,
        client_summary: suggestion.title,
        developer_explanation: suggestion.description,
        confidence: 1.0,
      }

      expect(previewPayload.selector).toBe('#hero-cta')
      expect(previewPayload.client_summary).toBe('High Contrast Primary Button')
      expect(previewPayload.css_rules).toContain('linear-gradient')

      // Confirm pin payload
      const sessionId = 'session-mock-uuid'
      const activeInspoUrl = 'https://example.com/palette.png'

      const confirmPinPayload = {
        session_id: sessionId,
        selector: suggestion.selector,
        image_base64: null,
        inspo_image_url: activeInspoUrl,
        css_mutations: suggestion.css_mutations,
        css_rules: suggestion.css_rules,
        text_mutation: null,
        client_summary: suggestion.title,
        developer_explanation: suggestion.description,
        rect: null,
      }

      expect(confirmPinPayload.session_id).toBe(sessionId)
      expect(confirmPinPayload.selector).toBe('#hero-cta')
      expect(confirmPinPayload.inspo_image_url).toBe(activeInspoUrl)
      expect(confirmPinPayload.client_summary).toBe(suggestion.title)
    })
  })

  // ─── 4. Inspiration Upload Payload Contract ────────────────────────────────
  describe('Copilot Visual Inspiration Contract', () => {
    it('composes full prompt and attaches inspo_image_url when active', () => {
      const activeInspo: ActiveInspiration = {
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        prompt: 'Clean minimal dark mode with neon violet accents',
      }

      const userPrompt = 'make the pricing cards stand out'

      const composePrompt = (userText: string, inspo: ActiveInspiration | null): string => {
        const trimmed = userText.trim()
        if (inspo?.prompt) {
          return `[Inspiration: ${inspo.prompt}] ${trimmed}`
        }
        return trimmed
      }

      const fullPrompt = composePrompt(userPrompt, activeInspo)
      expect(fullPrompt).toBe('[Inspiration: Clean minimal dark mode with neon violet accents] make the pricing cards stand out')

      const parsePayload = {
        prompt: fullPrompt,
        micro_dom: [{ selector: '.pricing-card', tag: 'DIV' }],
        viewport: { width: 1440, height: 900 },
        session_id: 'session-123',
        inspo_image_url: activeInspo.imageUrl,
      }

      expect(parsePayload.inspo_image_url).toContain('data:image/png;base64')
      expect(parsePayload.prompt).toContain('[Inspiration:')
    })

    it('falls back to pure user prompt when no inspiration is active', () => {
      const userPrompt = 'increase headline line-height'
      const composePrompt = (userText: string, inspo: ActiveInspiration | null): string => {
        const trimmed = userText.trim()
        if (inspo?.prompt) {
          return `[Inspiration: ${inspo.prompt}] ${trimmed}`
        }
        return trimmed
      }

      expect(composePrompt(userPrompt, null)).toBe('increase headline line-height')
    })
  })
})
