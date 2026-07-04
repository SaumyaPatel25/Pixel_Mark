import { Marker } from '@/types/markers'

export interface ScreenPosition {
  x: number
  y: number
  mode: 'dom' | 'fuzzy_dom' | 'viewport_fallback' | 'unresolved'
}

export interface ResolvedTarget {
  element: HTMLElement | null
  mode: 'dom' | 'fuzzy_dom' | 'viewport_fallback' | 'unresolved'
}

/**
 * Attempts to resolve a DOM marker's target element in the current document.
 * Follows a hierarchy: querySelector -> xpath -> fuzzy text fallback -> viewport ratio.
 */
export function resolveDomTarget(marker: Marker, iframeDocument: Document | null): ResolvedTarget {
  if (!iframeDocument) return { element: null, mode: 'unresolved' }
  if (marker.anchor_kind !== 'dom-relative') return { element: null, mode: 'viewport_fallback' }

  // 1. Try selector
  if (marker.target_selector && marker.target_selector !== 'unknown') {
    try {
      const el = iframeDocument.querySelector(marker.target_selector) as HTMLElement
      if (el) return { element: el, mode: 'dom' }
    } catch (e) {
      // Invalid selector (e.g. some generated mess)
      console.debug('[Placement] Invalid selector:', marker.target_selector)
    }
  }

  // 2. Try XPath
  if (marker.target_xpath) {
    try {
      const result = iframeDocument.evaluate(
        marker.target_xpath,
        iframeDocument,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )
      if (result.singleNodeValue) {
        return { element: result.singleNodeValue as HTMLElement, mode: 'dom' }
      }
    } catch (e) {
      console.debug('[Placement] Invalid xpath:', marker.target_xpath)
    }
  }

  // 3. Try fuzzy text fallback (e.g. tag + text content match)
  if (marker.dom_text_excerpt) {
    const excerpt = marker.dom_text_excerpt.trim().toLowerCase();
    if (excerpt.length > 2) {
      let candidates: HTMLElement[] = [];
      if (marker.element_rect_json?.tagName) {
        const tagName = marker.element_rect_json.tagName.toLowerCase();
        candidates = Array.from(iframeDocument.getElementsByTagName(tagName)) as HTMLElement[];
      } else {
        candidates = Array.from(iframeDocument.querySelectorAll('p, span, div, button, a, h1, h2, h3, h4, h5, h6, label')) as HTMLElement[];
      }
      
      const match = candidates.find(el => {
        const text = (el.textContent || '').trim().toLowerCase();
        return text.includes(excerpt) || excerpt.includes(text);
      });
      if (match) {
        return { element: match, mode: 'fuzzy_dom' }
      }
    }
  }

  return { element: null, mode: 'viewport_fallback' }
}

/**
 * Computes the screen position for a DOM-relative marker.
 */
export function computeDomMarkerScreenPosition(marker: Marker, iframeDocument: Document | null, scrollPos: { x: number; y: number }): ScreenPosition {
  const { element, mode } = resolveDomTarget(marker, iframeDocument)
  
  if (!element) {
    return computeViewportFallbackPosition(marker, scrollPos)
  }

  const rect = element.getBoundingClientRect()
  
  // Calculate relative offset within the element, default to center (0.5)
  const offsetXRatio = marker.offset_x_ratio ?? 0.5
  const offsetYRatio = marker.offset_y_ratio ?? 0.5
  
  const clientX = rect.left + rect.width * offsetXRatio
  const clientY = rect.top + rect.height * offsetYRatio
 
  // Convert to iframe page coordinates (client + scroll)
  return {
    x: clientX + scrollPos.x,
    y: clientY + scrollPos.y,
    mode: mode
  }
}

/**
 * Computes the screen position for a canvas-relative marker.
 */
export function computeCanvasMarkerScreenPosition(marker: Marker, iframeDocument: Document | null, scrollPos: { x: number; y: number }): ScreenPosition {
  if (!iframeDocument || !marker.canvas_id) {
    return computeViewportFallbackPosition(marker, scrollPos)
  }

  const canvas = iframeDocument.getElementById(marker.canvas_id) as HTMLCanvasElement | null
  if (!canvas) {
    return computeViewportFallbackPosition(marker, scrollPos)
  }

  const rect = canvas.getBoundingClientRect()
  
  const canvasXRatio = marker.canvas_x_ratio ?? marker.offset_x_ratio ?? 0.5
  const canvasYRatio = marker.canvas_y_ratio ?? marker.offset_y_ratio ?? 0.5
  
  const clientX = rect.left + rect.width * canvasXRatio
  const clientY = rect.top + rect.height * canvasYRatio

  return {
    x: clientX + scrollPos.x,
    y: clientY + scrollPos.y,
    mode: 'dom'
  }
}

/**
 * Fallback computation using raw viewport coords + layout shifts if available.
 */
export function computeViewportFallbackPosition(marker: Marker, scrollPos: { x: number; y: number }): ScreenPosition {
  // If we have page_x / page_y directly from creation, we can use that for absolute positioning on the document
  if (marker.page_x != null && marker.page_y != null) {
     return {
       x: marker.page_x,
       y: marker.page_y,
       mode: 'viewport_fallback'
     }
  }

  // Fallback to viewport coordinates + current scroll
  if (marker.viewport_x != null && marker.viewport_y != null) {
    return {
      x: marker.viewport_x + scrollPos.x,
      y: marker.viewport_y + scrollPos.y,
      mode: 'viewport_fallback'
    }
  }

  return { x: 0, y: 0, mode: 'unresolved' }
}

/**
 * Unified dispatcher to compute marker screen position based on anchor kind.
 * Returns coordinates relative to the TOP-LEFT OF THE IFRAME DOCUMENT (pageX/pageY equivalents).
 */
export function computeMarkerScreenPosition(marker: Marker, iframeDocument: Document | null, scrollPos: { x: number; y: number }): ScreenPosition {
  switch (marker.anchor_kind) {
    case 'canvas-relative':
    case 'webgl-clip-space':
      return computeCanvasMarkerScreenPosition(marker, iframeDocument, scrollPos)
    
    case 'dom-relative':
      return computeDomMarkerScreenPosition(marker, iframeDocument, scrollPos)
      
    case 'viewport-absolute':
    case 'manual':
    default:
      return computeViewportFallbackPosition(marker, scrollPos)
  }
}

/**
 * Clamps a value between 0 and 1
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function getSelector(el: HTMLElement): string {
  if (!el || el.nodeType !== 1) return 'unknown'
  if (el.id) return '#' + el.id
  const testid = el.getAttribute('data-testid')
  if (testid) return `[data-testid="${testid}"]`
  const name = el.getAttribute('name')
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`
  const classes: string[] = []
  for (let i = 0; i < el.classList.length && i < 3; i++) {
    if (el.classList[i].length < 50) classes.push(el.classList[i])
  }
  const base = el.tagName.toLowerCase()
  return classes.length ? `${base}.${classes.join('.')}` : base
}

function getXPath(el: HTMLElement, doc: Document): string {
  if (!el || el === doc.body) return '/html/body'
  const parts: string[] = []
  let curr: Node | null = el
  while (curr && curr.nodeType === 1) {
    const element = curr as HTMLElement
    let idx = 1
    let sib = element.previousSibling
    while (sib) {
      if (sib.nodeType === 1 && (sib as HTMLElement).tagName === element.tagName) idx++
      sib = sib.previousSibling
    }
    parts.unshift(`${element.tagName.toLowerCase()}[${idx}]`)
    curr = element.parentNode
  }
  return '/' + parts.join('/')
}

/**
 * Given a new drag-end position (clientX/clientY relative to iframe viewport),
 * recalculates the canonical offset ratios for a DOM marker by resolving the
 * element at the new drop location.
 */
export function buildDomMovePatch(marker: Marker, iframeDocument: Document | null, clientX: number, clientY: number, currentScroll: { x: number, y: number }): Partial<Marker> | null {
  if (marker.anchor_kind !== 'dom-relative') {
     // If not DOM relative, just update the absolute fallback coords
     return {
       expected_version: marker.version,
       viewport_x: clientX,
       viewport_y: clientY,
       page_x: clientX + currentScroll.x,
       page_y: clientY + currentScroll.y,
       scroll_x: currentScroll.x,
       scroll_y: currentScroll.y,
       anchor_mode: 'viewport_fallback'
     } as Partial<Marker>
  }

  // DOM relative marker: locate new target element at the client drop coordinates
  let el: HTMLElement | null = null
  if (iframeDocument) {
    el = iframeDocument.elementFromPoint(clientX, clientY) as HTMLElement | null
    // Fall back to document.body if elementFromPoint returned HTML tag or null
    if (!el || el.tagName === 'HTML') {
      el = iframeDocument.body
    }
  }

  if (!el) {
    // If we absolutely cannot resolve any element (not even body), fallback
    return {
       expected_version: marker.version,
       viewport_x: clientX,
       viewport_y: clientY,
       page_x: clientX + currentScroll.x,
       page_y: currentScroll.y,
       scroll_x: currentScroll.x,
       scroll_y: currentScroll.y,
       offset_x_ratio: 0.5,
       offset_y_ratio: 0.5,
       anchor_mode: 'viewport_fallback'
    } as Partial<Marker>
  }

  const rect = el.getBoundingClientRect()
  const offset_x_ratio = clamp01((clientX - rect.left) / (rect.width || 1))
  const offset_y_ratio = clamp01((clientY - rect.top) / (rect.height || 1))
  const selector = getSelector(el)
  const xpath = getXPath(el, iframeDocument!)
  const textExcerpt = (el.textContent || '').trim().slice(0, 100)

  return {
    expected_version: marker.version,
    offset_x_ratio,
    offset_y_ratio,
    target_selector: selector,
    target_xpath: xpath,
    dom_text_excerpt: textExcerpt,
    viewport_x: clientX,
    viewport_y: clientY,
    page_x: clientX + currentScroll.x,
    page_y: clientY + currentScroll.y,
    scroll_x: currentScroll.x,
    scroll_y: currentScroll.y,
    anchor_mode: 'dom'
  } as Partial<Marker>
}
