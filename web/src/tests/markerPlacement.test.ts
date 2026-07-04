import { describe, it, expect, beforeEach } from 'vitest'
import { computeMarkerScreenPosition, buildDomMovePatch, resolveDomTarget } from '@/lib/markerPlacement'
import { Marker } from '@/types/markers'

describe('markerPlacement', () => {
  let mockDoc: any

  beforeEach(() => {
    // Create a very basic mock document
    const mockBody = {
      tagName: 'BODY',
      nodeType: 1,
      getAttribute: () => null,
      classList: { length: 0 }
    }
    mockDoc = {
      body: mockBody,
      elementFromPoint: (x: number, y: number) => {
        return {
          tagName: 'DIV',
          nodeType: 1,
          id: 'valid',
          classList: { length: 0 },
          getAttribute: () => null,
          getBoundingClientRect: () => ({ left: 100, top: 200, width: 50, height: 50 }),
          textContent: 'Mock text content',
          parentNode: mockBody
        }
      },
      querySelector: (selector: string) => {
        if (selector === '#valid') {
          return {
            getBoundingClientRect: () => ({ left: 100, top: 200, width: 50, height: 50 }),
            getAttribute: () => null,
            classList: { length: 0 }
          }
        }
        return null
      },
      evaluate: () => ({
        singleNodeValue: null
      }),
      getElementById: (id: string) => {
        if (id === 'my-canvas') {
          return {
            getBoundingClientRect: () => ({ left: 50, top: 50, width: 800, height: 600 }),
            getAttribute: () => null,
            classList: { length: 0 }
          }
        }
        return null
      }
    }
  })

  describe('resolveDomTarget', () => {
    it('returns null if anchor_kind is not dom-relative', () => {
      const marker = { anchor_kind: 'canvas-relative' } as Marker
      expect(resolveDomTarget(marker, mockDoc).element).toBeNull()
    })

    it('resolves element via selector', () => {
      const marker = { anchor_kind: 'dom-relative', target_selector: '#valid' } as Marker
      const el = resolveDomTarget(marker, mockDoc)
      expect(el.element).not.toBeNull()
      expect(el.mode).toBe('dom')
    })

    it('returns null for invalid selector', () => {
      const marker = { anchor_kind: 'dom-relative', target_selector: '#invalid' } as Marker
      expect(resolveDomTarget(marker, mockDoc).element).toBeNull()
    })

    it('falls back to fuzzy text matching if selector and xpath fail', () => {
      const marker = {
        anchor_kind: 'dom-relative',
        target_selector: '#missing',
        dom_text_excerpt: 'Click Me',
        element_rect_json: { tagName: 'BUTTON' }
      } as Marker

      const mockDocWithFuzzy = {
        ...mockDoc,
        querySelector: () => null,
        getElementsByTagName: (tagName: string) => {
          if (tagName.toLowerCase() === 'button') {
            return [
              {
                textContent: 'Cancel',
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 })
              },
              {
                textContent: 'Click Me Now',
                getBoundingClientRect: () => ({ left: 150, top: 250, width: 60, height: 30 })
              }
            ]
          }
          return []
        }
      } as any

      const res = resolveDomTarget(marker, mockDocWithFuzzy)
      expect(res.element).not.toBeNull()
      expect(res.element!.textContent).toBe('Click Me Now')
      expect(res.mode).toBe('fuzzy_dom')
    })
  })

  describe('computeMarkerScreenPosition', () => {
    it('computes exact-dom coordinates correctly', () => {
      const marker = {
        anchor_kind: 'dom-relative',
        target_selector: '#valid',
        offset_x_ratio: 0.5, // Center
        offset_y_ratio: 0.5
      } as Marker

      // rect is left: 100, top: 200, w: 50, h: 50. Center is (125, 225)
      // client + scroll = (125, 225) + (10, 20) = 135, 245
      const pos = computeMarkerScreenPosition(marker, mockDoc, { x: 10, y: 20 })
      
      expect(pos.x).toBe(135)
      expect(pos.y).toBe(245)
      expect(pos.mode).toBe('dom')
    })

    it('computes exact-canvas coordinates correctly', () => {
      const marker = {
        anchor_kind: 'canvas-relative',
        canvas_id: 'my-canvas',
        canvas_x_ratio: 0.25,
        canvas_y_ratio: 0.75
      } as Marker

      // rect is left: 50, top: 50, w: 800, h: 600. Point is (50 + 200, 50 + 450) = (250, 500)
      const pos = computeMarkerScreenPosition(marker, mockDoc, { x: 0, y: 0 })
      
      expect(pos.x).toBe(250)
      expect(pos.y).toBe(500)
      expect(pos.mode).toBe('dom')
    })

    it('falls back to viewport if target not found', () => {
      const marker = {
        anchor_kind: 'dom-relative',
        target_selector: '#missing',
        page_x: 300,
        page_y: 400
      } as Marker

      const pos = computeMarkerScreenPosition(marker, mockDoc, { x: 0, y: 0 })
      expect(pos.x).toBe(300)
      expect(pos.y).toBe(400)
      expect(pos.mode).toBe('viewport_fallback')
    })
  })

  describe('buildDomMovePatch', () => {
    it('updates offset ratios relative to new client coordinates', () => {
      const marker = {
        anchor_kind: 'dom-relative',
        target_selector: '#valid',
        version: 1
      } as Marker

      // Element rect is { left: 100, top: 200, width: 50, height: 50 }
      // User drops it at clientX: 110, clientY: 225
      const patch = buildDomMovePatch(marker, mockDoc, 110, 225, { x: 0, y: 0 })

      expect(patch).not.toBeNull()
      expect(patch!.offset_x_ratio).toBeCloseTo(0.2) // (110 - 100) / 50 = 0.2
      expect(patch!.offset_y_ratio).toBeCloseTo(0.5) // (225 - 200) / 50 = 0.5
      expect(patch!.viewport_x).toBe(110)
      expect(patch!.viewport_y).toBe(225)
      expect(patch!.expected_version).toBe(1)
    })

    it('clamps offset ratios between 0 and 1', () => {
      const marker = {
        anchor_kind: 'dom-relative',
        target_selector: '#valid',
        version: 1
      } as Marker

      // Element rect is { left: 100, top: 200, width: 50, height: 50 }
      // User drops it way outside (clientX: 500, clientY: -100)
      const patch = buildDomMovePatch(marker, mockDoc, 500, -100, { x: 0, y: 0 })

      expect(patch!.offset_x_ratio).toBe(1) // Max 1
      expect(patch!.offset_y_ratio).toBe(0) // Min 0
    })
  })
})
