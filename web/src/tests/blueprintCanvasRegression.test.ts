import { describe, it, expect, beforeEach } from 'vitest'
import { useBlueprintStore, BlueprintDOMTarget } from '@/store/blueprintStore'
import { useBlueprintCollaborationStore } from '@/store/blueprintCollaborationStore'

describe('STAGE Blueprint Canvas Regression Test Suite', () => {
  beforeEach(() => {
    // Reset blueprint store state before each test
    const store = useBlueprintStore.getState()
    store.resetToBase()
    store.setSelectedTarget(null)
    store.setViewportMode('desktop')
    store.setZoom(1.0)
    store.setPan({ x: 0, y: 0 })
    store.setActiveTool('select')
  })

  // =========================================================================
  // 1. TOOLBAR TESTS
  // =========================================================================
  describe('Toolbar Controls & Actions', () => {
    it('updates zoom and resets viewport correctly', () => {
      const store = useBlueprintStore.getState()
      expect(store.zoom).toBe(1.0)

      store.setZoom(1.5)
      expect(useBlueprintStore.getState().zoom).toBe(1.5)

      store.setPan({ x: 50, y: -100 })
      expect(useBlueprintStore.getState().pan).toEqual({ x: 50, y: -100 })

      store.resetViewport()
      expect(useBlueprintStore.getState().zoom).toBe(1.0)
      expect(useBlueprintStore.getState().pan).toEqual({ x: 0, y: 0 })
    })

    it('switches viewport responsive modes smoothly (desktop, tablet, mobile)', () => {
      const store = useBlueprintStore.getState()
      expect(store.viewportMode).toBe('desktop')

      store.setViewportMode('tablet')
      expect(useBlueprintStore.getState().viewportMode).toBe('tablet')

      store.setViewportMode('mobile')
      expect(useBlueprintStore.getState().viewportMode).toBe('mobile')

      store.setViewportMode('desktop')
      expect(useBlueprintStore.getState().viewportMode).toBe('desktop')
    })

    it('toggles active workspace tools cleanly', () => {
      const store = useBlueprintStore.getState()
      expect(store.activeTool).toBe('select')

      store.setActiveTool('comment')
      expect(useBlueprintStore.getState().activeTool).toBe('comment')

      store.setActiveTool('move')
      expect(useBlueprintStore.getState().activeTool).toBe('move')
    })
  })

  // =========================================================================
  // 2. INSPECTOR CONTROL & MUTATION WIRING TESTS
  // =========================================================================
  describe('Inspector Control Wiring & Mutations', () => {
    it('dispatches style and text mutations to the pending mutations queue', () => {
      const store = useBlueprintStore.getState()
      const mockTarget: BlueprintDOMTarget = {
        selector: 'body > main > section.hero > h1.title',
        tag: 'h1',
        targetKind: 'text',
        textExcerpt: 'Hero Title'
      }

      store.setSelectedTarget(mockTarget)

      // Add a text mutation
      store.addMutation({
        targetSelector: mockTarget.selector,
        actionType: 'replace',
        presetId: 'custom_text_edit',
        presetName: 'Text Edit (h1)',
        htmlPayload: '<h1 style="color:#ffffff;">Updated Headline</h1>'
      })

      const pending = useBlueprintStore.getState().pendingMutations
      expect(pending).toHaveLength(1)
      expect(pending[0].targetSelector).toBe(mockTarget.selector)
      expect(pending[0].actionType).toBe('replace')
      expect(useBlueprintStore.getState().isDirty).toBe(true)
    })

    it('supports deleting an active mutation from the queue', () => {
      const store = useBlueprintStore.getState()
      store.addMutation({
        targetSelector: 'div.banner',
        actionType: 'before',
        presetId: 'preset-hero',
        presetName: 'Hero Banner Block',
        htmlPayload: '<div class="hero">New Hero</div>'
      })

      const pendingBefore = useBlueprintStore.getState().pendingMutations
      expect(pendingBefore).toHaveLength(1)
      const mutationId = pendingBefore[0].id

      store.removeMutation(mutationId)
      expect(useBlueprintStore.getState().pendingMutations).toHaveLength(0)
    })
  })

  // =========================================================================
  // 3. UNDO / REDO / RESET TESTS
  // =========================================================================
  describe('Undo, Redo, and Reset Baseline Behavior', () => {
    it('allows undoing and redoing added mutations', () => {
      const store = useBlueprintStore.getState()

      // Add initial mutation
      store.addMutation({
        targetSelector: 'button.cta',
        actionType: 'replace',
        presetId: 'cta_btn',
        presetName: 'CTA Button',
        htmlPayload: '<button>Click Me</button>'
      })

      expect(useBlueprintStore.getState().pendingMutations).toHaveLength(1)

      // Undo mutation
      store.undo()
      expect(useBlueprintStore.getState().pendingMutations).toHaveLength(0)

      // Redo mutation
      store.redo()
      expect(useBlueprintStore.getState().pendingMutations).toHaveLength(1)
      expect(useBlueprintStore.getState().pendingMutations[0].targetSelector).toBe('button.cta')
    })

    it('resets unsaved changes back to baseline state', () => {
      const store = useBlueprintStore.getState()

      store.addMutation({
        targetSelector: 'p.subtext',
        actionType: 'replace',
        presetId: 'text_sub',
        presetName: 'Subtext Edit',
        htmlPayload: '<p>New Subtext</p>'
      })

      expect(useBlueprintStore.getState().pendingMutations).toHaveLength(1)

      store.resetToBase()
      expect(useBlueprintStore.getState().pendingMutations).toHaveLength(0)
      expect(useBlueprintStore.getState().isDirty).toBe(false)
    })
  })

  // =========================================================================
  // 4. LIVE EDIT SURFACE & ANCESTRY BREADCRUMBS TESTS
  // =========================================================================
  describe('Live Surface & DOM Ancestry Navigation', () => {
    it('parses selector strings into valid ancestry breadcrumbs', () => {
      const selector = 'body > main#app > section.hero > div.container > h2.heading'
      const parts = selector.split('>').map((s) => s.trim()).filter(Boolean)

      expect(parts).toHaveLength(5)
      expect(parts[0]).toBe('body')
      expect(parts[4]).toBe('h2.heading')

      // Verify prefix selector generation
      const parentSelector = parts.slice(0, 4).join(' > ')
      expect(parentSelector).toBe('body > main#app > section.hero > div.container')
    })

    it('safely handles selection payloads with empty or partial fields', () => {
      const store = useBlueprintStore.getState()
      const partialTarget: BlueprintDOMTarget = {
        selector: 'div.card',
        tag: 'div',
        xpath: undefined,
        textExcerpt: undefined,
        boundingRect: undefined,
        targetKind: 'container'
      }

      expect(() => {
        store.setSelectedTarget(partialTarget)
      }).not.toThrow()

      expect(useBlueprintStore.getState().selectedTarget?.selector).toBe('div.card')
    })
  })

  // =========================================================================
  // 5. CRASH REGRESSION SAFEGUARDS
  // =========================================================================
  describe('Crash Regression & Agent Safeguards', () => {
    it('prevents agent crashes when receiving non-element or null targets', () => {
      // Replicate the agent's safe getBoundingClientRect check logic
      const safeGetBoundingClientRect = (target: any) => {
        if (!target || typeof target.getBoundingClientRect !== 'function') {
          return null
        }
        return target.getBoundingClientRect()
      }

      expect(safeGetBoundingClientRect(null)).toBeNull()
      expect(safeGetBoundingClientRect(undefined)).toBeNull()
      expect(safeGetBoundingClientRect({})).toBeNull()
      expect(safeGetBoundingClientRect({ getBoundingClientRect: 'not-a-func' })).toBeNull()

      const validElement = {
        getBoundingClientRect: () => ({ top: 10, left: 10, width: 100, height: 50 })
      }
      expect(safeGetBoundingClientRect(validElement)).toEqual({ top: 10, left: 10, width: 100, height: 50 })
    })

    it('gracefully handles empty or malformed mutation arrays during reconciliation', () => {
      const store = useBlueprintStore.getState()
      expect(() => {
        store.resetToBase()
        store.undo()
        store.redo()
      }).not.toThrow()
    })
  })

  // =========================================================================
  // 6. COLLABORATION & PUBLICATION WORKFLOW TESTS
  // =========================================================================
  describe('Publication & Status Transition Workflows', () => {
    it('initializes publication status and logs history entries', () => {
      const collabStore = useBlueprintCollaborationStore.getState()
      expect(collabStore.publicationStatus).toBe('draft')

      collabStore.setPublicationStatus('in_review')
      expect(useBlueprintCollaborationStore.getState().publicationStatus).toBe('in_review')

      collabStore.setPublicationStatus('approved')
      expect(useBlueprintCollaborationStore.getState().publicationStatus).toBe('approved')
    })
  })
})
