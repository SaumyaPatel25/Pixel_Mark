import { describe, it, expect } from 'vitest'
import { canCurrentActorMutateMarker } from '@/lib/permissions'
import { Marker } from '@/types/markers'

function mockMarker(overrides: Partial<Marker> = {}): Marker {
  return {
    id: 'marker-1',
    session_id: 'session-1',
    project_id: 'proj-1',
    page_visit_id: null,
    creator_id: 'reviewer-1',
    creator_name: 'Alice',
    creator_role: 'reviewer',
    color_token: 'violet',
    anchor_kind: 'manual',
    page_url: null,
    page_title: null,
    target_selector: null,
    target_xpath: null,
    dom_text_excerpt: null,
    offset_x_ratio: null,
    offset_y_ratio: null,
    viewport_x: null,
    viewport_y: null,
    page_x: null,
    page_y: null,
    viewport_width: null,
    viewport_height: null,
    element_rect_json: null,
    scroll_x: null,
    scroll_y: null,
    canvas_id: null,
    canvas_x_ratio: null,
    canvas_y_ratio: null,
    webgl_clip_x: null,
    webgl_clip_y: null,
    renderer_type: null,
    title: 'Test',
    description: null,
    status: 'open',
    priority: 'medium',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    version: 1,
    browser: null,
    os: null,
    device_pixel_ratio: null,
    console_errors_json: null,
    network_errors_json: null,
    screenshot_url: null,
    encrypted_context: null,
    ...overrides,
  }
}

describe('canCurrentActorMutateMarker', () => {
  it('returns false if actor is null', () => {
    const marker = mockMarker()
    expect(canCurrentActorMutateMarker(null, marker)).toBe(false)
  })

  it('developer can mutate any marker', () => {
    const marker = mockMarker({ creator_id: 'reviewer-1', creator_role: 'reviewer' })
    const actor = { id: 'dev-user', role: 'developer' as const }
    expect(canCurrentActorMutateMarker(actor, marker)).toBe(true)
  })

  it('developer can mutate markers created by other developers', () => {
    const marker = mockMarker({ creator_id: 'another-dev', creator_role: 'developer' })
    const actor = { id: 'dev-user', role: 'developer' as const }
    expect(canCurrentActorMutateMarker(actor, marker)).toBe(true)
  })

  it('reviewer can mutate their own markers', () => {
    const marker = mockMarker({ creator_id: 'reviewer-1', creator_role: 'reviewer' })
    const actor = { id: 'reviewer-1', role: 'reviewer' as const }
    expect(canCurrentActorMutateMarker(actor, marker)).toBe(true)
  })

  it('reviewer cannot mutate another reviewer\'s markers', () => {
    const marker = mockMarker({ creator_id: 'reviewer-2', creator_role: 'reviewer' })
    const actor = { id: 'reviewer-1', role: 'reviewer' as const }
    expect(canCurrentActorMutateMarker(actor, marker)).toBe(false)
  })

  it('reviewer cannot mutate markers created by a developer', () => {
    const marker = mockMarker({ creator_id: 'dev-user', creator_role: 'developer' })
    const actor = { id: 'reviewer-1', role: 'reviewer' as const }
    expect(canCurrentActorMutateMarker(actor, marker)).toBe(false)
  })

  it('returns false if actor has no role', () => {
    const marker = mockMarker()
    const actor = { id: 'reviewer-1', role: undefined as any }
    expect(canCurrentActorMutateMarker(actor, marker)).toBe(false)
  })
})
