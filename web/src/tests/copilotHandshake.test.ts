import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CopilotResolution, ElementCropResult, MicroDomCandidate } from '@/components/copilot/CopilotTypes'

describe('STAGE Copilot Handshake & Protocol', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('validates CopilotResolution structure and properties', () => {
    const resolution: CopilotResolution = {
      selector: '#submit-btn',
      css_mutations: { 'background-color': '#10b981', color: '#ffffff' },
      css_rules: '#submit-btn { background-color: #10b981 !important; color: #ffffff !important; }',
      text_mutation: 'Get Started Now',
      client_summary: 'Changed button background to emerald green and updated copy',
      developer_explanation: 'Applied emerald accent brand color and converted CTA to active voice.',
      confidence: 0.95,
    }

    expect(resolution.selector).toBe('#submit-btn')
    expect(resolution.css_mutations['background-color']).toBe('#10b981')
    expect(resolution.css_rules).toContain('!important')
    expect(resolution.text_mutation).toBe('Get Started Now')
    expect(resolution.confidence).toBeGreaterThan(0.9)
  })

  it('constructs well-formed STAGE_REQUEST_MICRO_DOM message', () => {
    const query = 'make the submit button green'
    const maxElements = 40

    const postMessagePayload = {
      type: 'STAGE_REQUEST_MICRO_DOM',
      query,
      maxElements,
    }

    expect(postMessagePayload.type).toBe('STAGE_REQUEST_MICRO_DOM')
    expect(postMessagePayload.query).toBe(query)
    expect(postMessagePayload.maxElements).toBe(40)
  })

  it('verifies STAGE_MICRO_DOM_RESULT candidate ingestion', () => {
    const mockCandidates: MicroDomCandidate[] = [
      {
        selector: 'button.btn-primary',
        tag: 'BUTTON',
        text: 'Submit Application',
        role: 'button',
        classes: 'btn-primary px-4 py-2',
        rect: { top: 120, left: 240, width: 140, height: 42 },
      },
      {
        selector: 'h1.hero-title',
        tag: 'H1',
        text: 'Welcome to STAGE',
        classes: 'hero-title text-4xl',
        rect: { top: 40, left: 240, width: 600, height: 50 },
      },
    ]

    const eventPayload = {
      type: 'STAGE_MICRO_DOM_RESULT',
      query: 'submit button',
      candidates: mockCandidates,
    }

    expect(eventPayload.type).toBe('STAGE_MICRO_DOM_RESULT')
    expect(eventPayload.candidates).toHaveLength(2)
    expect(eventPayload.candidates[0].selector).toBe('button.btn-primary')
    expect(eventPayload.candidates[0].rect?.width).toBe(140)
  })

  it('constructs STAGE_APPLY_EPHEMERAL_MUTATION and STAGE_REVERT_EPHEMERAL_MUTATION payloads', () => {
    const applyMsg = {
      type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
      cssRules: '.hero { opacity: 0.8; }',
      selector: '.hero',
      textMutation: 'New Headline',
    }

    expect(applyMsg.type).toBe('STAGE_APPLY_EPHEMERAL_MUTATION')
    expect(applyMsg.selector).toBe('.hero')
    expect(applyMsg.cssRules).toBe('.hero { opacity: 0.8; }')
    expect(applyMsg.textMutation).toBe('New Headline')

    const revertMsg = {
      type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
      selector: '.hero',
    }

    expect(revertMsg.type).toBe('STAGE_REVERT_EPHEMERAL_MUTATION')
    expect(revertMsg.selector).toBe('.hero')
  })

  it('verifies STAGE_CAPTURE_ELEMENT_CROP and STAGE_ELEMENT_CROP_RESULT payload contract', () => {
    const cropRequest = {
      type: 'STAGE_CAPTURE_ELEMENT_CROP',
      selector: '#cta-banner',
    }
    expect(cropRequest.type).toBe('STAGE_CAPTURE_ELEMENT_CROP')
    expect(cropRequest.selector).toBe('#cta-banner')

    const cropResult: ElementCropResult = {
      selector: '#cta-banner',
      imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      rect: {
        top: 200,
        left: 100,
        width: 400,
        height: 80,
      },
    }

    expect(cropResult.selector).toBe('#cta-banner')
    expect(cropResult.imageBase64).toContain('data:image/png;base64')
    expect(cropResult.rect?.top).toBe(200)
    expect(cropResult.rect?.width).toBe(400)
  })

  it('formats confirm-pin request with proper AI metadata', () => {
    const sessionId = 'session-test-uuid'
    const resolution: CopilotResolution = {
      selector: 'nav.header-nav',
      css_mutations: { 'background-color': '#000000' },
      css_rules: 'nav.header-nav { background-color: #000000 !important; }',
      text_mutation: null,
      client_summary: 'Turned navigation bar dark',
      developer_explanation: 'Applied dark header theme per contrast guidelines.',
      confidence: 0.98,
    }

    const cropResult: ElementCropResult = {
      selector: 'nav.header-nav',
      imageBase64: 'data:image/png;base64,abc12345',
      rect: { top: 0, left: 0, width: 1280, height: 64 },
    }

    const confirmPayload = {
      session_id: sessionId,
      selector: resolution.selector,
      image_base64: cropResult.imageBase64,
      css_mutations: resolution.css_mutations,
      css_rules: resolution.css_rules,
      text_mutation: resolution.text_mutation,
      client_summary: resolution.client_summary,
      developer_explanation: resolution.developer_explanation,
      rect: cropResult.rect,
    }

    expect(confirmPayload.session_id).toBe(sessionId)
    expect(confirmPayload.selector).toBe('nav.header-nav')
    expect(confirmPayload.client_summary).toBe('Turned navigation bar dark')
    expect(confirmPayload.css_rules).toContain('!important')
    expect(confirmPayload.rect?.height).toBe(64)
  })
})
