import { describe, it, expect, beforeEach } from 'vitest'
import { resolveMarkerRenderPosition, buildDomMovePatch, computePinScreenPosition } from '@/lib/markerPlacement'
import { CanonicalMarkerAnchor } from '@/types/markers'

describe('markerPlacement', () => {
  let mockWin: any
  let mockDoc: any

  beforeEach(() => {
    mockWin = {
      scrollX: 10,
      scrollY: 20
    }
    
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
      querySelectorAll: (selector: string) => {
        return []
      }
    }
  })

  describe('resolveMarkerRenderPosition', () => {
    it('resolves element via selector', () => {
      const marker = {
        anchorMode: 'dom',
        elementSelector: '#valid',
        offsetXRatio: 0.5,
        offsetYRatio: 0.5
      } as CanonicalMarkerAnchor

      const pos = resolveMarkerRenderPosition(marker, mockWin, mockDoc)
      expect(pos).not.toBeNull()
      expect(pos!.left).toBe(135) // rect.left(100) + scrollX(10) + rect.width(50)*0.5 = 135
      expect(pos!.top).toBe(245)  // rect.top(200) + scrollY(20) + rect.height(50)*0.5 = 245
      expect(pos!.source).toBe('dom')
      expect(pos!.degraded).toBe(false)
    })

    it('falls back to fuzzy text matching if selector and xpath fail', () => {
      const marker = {
        anchorMode: 'dom',
        elementSelector: '#missing',
        textHint: 'Click Me'
      } as CanonicalMarkerAnchor

      const mockDocWithFuzzy = {
        ...mockDoc,
        querySelector: () => null,
        querySelectorAll: (selector: string) => {
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
      } as any

      const pos = resolveMarkerRenderPosition(marker, mockWin, mockDocWithFuzzy)
      expect(pos).not.toBeNull()
      expect(pos!.left).toBe(190) // 150 + 10 + 60*0.5 = 190
      expect(pos!.top).toBe(285)  // 250 + 20 + 30*0.5 = 285
      expect(pos!.source).toBe('fuzzy_dom')
      expect(pos!.degraded).toBe(true) // Fuzzy matching is degraded: true
    })

    it('falls back to viewport if target not found', () => {
      const marker = {
        anchorMode: 'dom',
        elementSelector: '#missing',
        pageX: 300,
        pageY: 400
      } as CanonicalMarkerAnchor

      const pos = resolveMarkerRenderPosition(marker, mockWin, mockDoc)
      expect(pos).not.toBeNull()
      expect(pos!.left).toBe(300)
      expect(pos!.top).toBe(400)
      expect(pos!.source).toBe('page_xy')
      expect(pos!.degraded).toBe(true)
    })
  })

  describe('buildDomMovePatch', () => {
    it('updates offset ratios relative to new client coordinates', () => {
      const marker = {
        anchorKind: 'dom-relative',
        version: 1
      } as any

      // Element rect is { left: 100, top: 200, width: 50, height: 50 }
      // User drops it at clientX: 110, clientY: 225
      const patch = buildDomMovePatch(marker, mockDoc, 110, 225, { x: 10, y: 20 })

      expect(patch).not.toBeNull()
      expect(patch!.offset_x_ratio).toBeCloseTo(0.2) // (110 - 100) / 50 = 0.2
      expect(patch!.offset_y_ratio).toBeCloseTo(0.5) // (225 - 200) / 50 = 0.5
      expect(patch!.viewport_x).toBe(110)
      expect(patch!.viewport_y).toBe(225)
      expect(patch!.expected_version).toBe(1)
    })

    it('clamps offset ratios between 0 and 1', () => {
      const marker = {
        anchorKind: 'dom-relative',
        version: 1
      } as any

      // Element rect is { left: 100, top: 200, width: 50, height: 50 }
      // User drops it way outside (clientX: 500, clientY: -100)
      const patch = buildDomMovePatch(marker, mockDoc, 500, -100, { x: 10, y: 20 })

      expect(patch!.offset_x_ratio).toBe(1) // Max 1
      expect(patch!.offset_y_ratio).toBe(0) // Min 0
    })
  })

  describe('computePinScreenPosition', () => {
    it('computes screen coordinates with scroll and iframe offset', () => {
      const marker = {
        elementSelector: '#valid',
        offsetXRatio: 0.5,
        offsetYRatio: 0.5
      } as CanonicalMarkerAnchor

      const iframeRect = { left: 50, top: 100, width: 800, height: 600 } as DOMRect

      const pos = computePinScreenPosition(marker, { x: 10, y: 20 }, iframeRect, mockWin, mockDoc)

      expect(pos).not.toBeNull()
      // pageLeft = 100 + 10 + 25 = 135; screenX = (135 - 10)*1 + 50 = 175
      expect(pos!.screenX).toBe(175)
      // pageTop = 200 + 20 + 25 = 245; screenY = (245 - 20)*1 + 100 = 325
      expect(pos!.screenY).toBe(325)
    })

    it('recalculates screen position when iframe scrolls', () => {
      const marker = {
        elementSelector: '#valid',
        offsetXRatio: 0.5,
        offsetYRatio: 0.5
      } as CanonicalMarkerAnchor

      const iframeRect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect

      // Scrolled down 100px: rect.top becomes 100
      const scrolledDoc = {
        ...mockDoc,
        querySelector: () => ({
          getBoundingClientRect: () => ({ left: 100, top: 100, width: 50, height: 50 }),
          getAttribute: () => null,
          classList: { length: 0 }
        })
      }
      const scrolledWin = { scrollX: 0, scrollY: 100 } as any as Window

      const pos = computePinScreenPosition(marker, { x: 0, y: 100 }, iframeRect, scrolledWin, scrolledDoc)

      expect(pos).not.toBeNull()
      // pageTop = 100 + 100 + 25 = 225
      expect(pos!.pageTop).toBe(225)
      // screenY = (225 - 100)*1 + 0 = 125 (rect.top + height*0.5 = 100 + 25 = 125)
      expect(pos!.screenY).toBe(125)
    })

    it('prevents scroll drift on viewport fallback coordinates', () => {
      const marker = {
        elementSelector: '#missing',
        viewportX: 200,
        viewportY: 300,
        scrollXAtCapture: 0,
        scrollYAtCapture: 50
      } as CanonicalMarkerAnchor

      const iframeRect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect

      // User scrolls down to scrollY = 300
      const scrolledWin = { scrollX: 0, scrollY: 300 } as any as Window

      const pos = computePinScreenPosition(marker, { x: 0, y: 300 }, iframeRect, scrolledWin, mockDoc)

      expect(pos).not.toBeNull()
      // pageTop should remain fixed at viewportY(300) + scrollYAtCapture(50) = 350
      expect(pos!.pageTop).toBe(350)
      // screenY = (350 - 300) = 50
      expect(pos!.screenY).toBe(50)
    })
  })
})
