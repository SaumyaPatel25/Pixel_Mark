import { Marker, CanonicalMarkerAnchor, ResolvedMarkerPosition, CanonicalMarkerAnchorMode } from '@/types/markers'

/**
 * Fallback computation using raw viewport coords + layout shifts if available.
 */
export function computeViewportFallbackPosition(marker: CanonicalMarkerAnchor, scrollPos: { x: number; y: number }): ResolvedMarkerPosition {
  if (marker.pageX != null && marker.pageY != null) {
     return {
       left: marker.pageX,
       top: marker.pageY,
       source: 'page_xy',
       confidence: 0.5,
       degraded: true
     }
  }

  if (marker.viewportX != null && marker.viewportY != null) {
    return {
      left: marker.viewportX + scrollPos.x,
      top: marker.viewportY + scrollPos.y,
      source: 'viewport_fallback',
      confidence: 0.2,
      degraded: true
    }
  }

  return { left: 0, top: 0, source: 'unresolved', confidence: 0, degraded: true }
}

export interface OverlayMetrics {
  scale: number
  offsetLeft: number
  offsetTop: number
}

export function toOverlayPosition(input: { pageLeft: number; pageTop: number }, metrics: OverlayMetrics) {
  return {
    left: input.pageLeft * metrics.scale + metrics.offsetLeft,
    top: input.pageTop * metrics.scale + metrics.offsetTop,
  }
}

export function resolveMarkerRenderPosition(
  marker: CanonicalMarkerAnchor,
  iframeWindow: Window | null,
  iframeDocument: Document | null
): ResolvedMarkerPosition | null {
  // Safe scroll reading
  let scrollPos = { x: 0, y: 0 }
  try {
    if (iframeWindow) {
      scrollPos.x = iframeWindow.scrollX ?? 0
      scrollPos.y = iframeWindow.scrollY ?? 0
    }
  } catch (_) {
    // Cross-origin safe fallback
  }
  
  // Fallback parameters DTO normalization
  const selector = marker.elementSelector || (marker as any).target_selector
  const xpath = marker.xpath || (marker as any).target_xpath
  const offsetX = marker.offsetXRatio ?? (marker as any).offset_x_ratio ?? 0.5
  const offsetY = marker.offsetYRatio ?? (marker as any).offset_y_ratio ?? 0.5
  
  // Compatibility reads for page coordinates
  const pgX = marker.pageX ?? (marker as any).page_x ?? (marker as any).x ?? (marker as any).pageLeft
  const pgY = marker.pageY ?? (marker as any).page_y ?? (marker as any).y ?? (marker as any).pageTop

  // Compatibility reads for viewport coordinates
  const vpX = marker.viewportX ?? (marker as any).viewport_x
  const vpY = marker.viewportY ?? (marker as any).viewport_y

  const rType = marker.rendererType || (marker as any).renderer_type || 'dom'
  const elementTag = (marker as any).elementTag || (marker as any).element_rect_json?.tagName || ''

  const isCanvas = 
    rType.includes('canvas') || 
    rType.includes('webgl') || 
    rType.includes('three') ||
    selector === 'visual-canvas-context' ||
    elementTag.toLowerCase() === 'canvas'

  let result: ResolvedMarkerPosition | null = null

  // 1. Selector resolution (DOM)
  if (!result && !isCanvas && selector && selector !== 'unknown' && selector !== 'visual-canvas-context' && iframeDocument) {
    try {
      const el = iframeDocument.querySelector(selector) as HTMLElement
      if (el) {
        const rect = el.getBoundingClientRect()
        const left = rect.left + scrollPos.x + rect.width * offsetX
        const top = rect.top + scrollPos.y + rect.height * offsetY
        if (Number.isFinite(left) && Number.isFinite(top)) {
          result = { left, top, source: 'dom', confidence: 1.0, degraded: false }
        }
      }
    } catch (_) {
      // Cross-origin querySelector SecurityError guard
    }
  }

  // 2. XPath resolution (DOM)
  if (!result && !isCanvas && xpath && iframeDocument) {
    try {
      const xpathResult = iframeDocument.evaluate(
        xpath,
        iframeDocument,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )
      if (xpathResult.singleNodeValue) {
        const el = xpathResult.singleNodeValue as HTMLElement
        const rect = el.getBoundingClientRect()
        const left = rect.left + scrollPos.x + rect.width * offsetX
        const top = rect.top + scrollPos.y + rect.height * offsetY
        if (Number.isFinite(left) && Number.isFinite(top)) {
          result = { left, top, source: 'dom', confidence: 0.9, degraded: false }
        }
      }
    } catch (_) {
      // Cross-origin evaluate SecurityError guard
    }
  }

  // 3. Canvas/WebGL resolution
  if (!result && isCanvas && iframeDocument) {
    try {
      const canvasEl = iframeDocument.querySelector('canvas') as HTMLCanvasElement | null
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect()
        const normX = (marker as any).canvas_x_ratio ?? marker.canvasContext?.normX ?? (marker as any).norm_x
        const normY = (marker as any).canvas_y_ratio ?? marker.canvasContext?.normY ?? (marker as any).norm_y

        let left: number | null = null
        let top: number | null = null

        if (typeof normX === 'number' && typeof normY === 'number') {
          left = rect.left + scrollPos.x + rect.width * normX
          top = rect.top + scrollPos.y + rect.height * normY
        } else {
          const coords = marker.canvasContext?.canvasCoords || (marker as any).canvas_context?.canvas_coords
          if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
            left = rect.left + scrollPos.x + coords.x
            top = rect.top + scrollPos.y + coords.y
          }
        }

        if (left !== null && top !== null && Number.isFinite(left) && Number.isFinite(top)) {
          result = { left, top, source: 'canvas', confidence: 1.0, degraded: false }
        }
      }
    } catch (_) {
      // Cross-origin querySelector SecurityError guard
    }
  }

  // 4. Fuzzy text fallback (excerpts)
  if (!result && iframeDocument) {
    const textHint = marker.textHint || (marker as any).dom_text_excerpt
    if (textHint) {
      const excerpt = textHint.trim().toLowerCase()
      if (excerpt.length > 2) {
        try {
          let candidates: HTMLElement[] = Array.from(iframeDocument.querySelectorAll('p, span, div, button, a, h1, h2, h3, h4, h5, h6, label')) as HTMLElement[]
          const match = candidates.find(el => {
            const text = (el.textContent || '').trim().toLowerCase()
            return text.includes(excerpt) || excerpt.includes(text)
          })
          if (match) {
            const rect = match.getBoundingClientRect()
            const left = rect.left + scrollPos.x + rect.width * offsetX
            const top = rect.top + scrollPos.y + rect.height * offsetY
            if (Number.isFinite(left) && Number.isFinite(top)) {
              result = { left, top, source: 'fuzzy_dom', confidence: 0.7, degraded: true }
            }
          }
        } catch (_) {
          // Cross-origin querySelectorAll SecurityError guard
        }
      }
    }
  }

  // 5. Bounding Box fallback
  if (!result && marker.boundingBoxAtCapture) {
    const { left: bboxLeft, top: bboxTop, width: bboxWidth, height: bboxHeight } = marker.boundingBoxAtCapture
    const left = bboxLeft + scrollPos.x + bboxWidth * offsetX
    const top = bboxTop + scrollPos.y + bboxHeight * offsetY
    if (Number.isFinite(left) && Number.isFinite(top)) {
      result = { left, top, source: 'bbox', confidence: 0.6, degraded: true }
    }
  }

  // 6. pageX/pageY fallback
  if (!result && typeof pgX === 'number' && typeof pgY === 'number' && Number.isFinite(pgX) && Number.isFinite(pgY)) {
    result = { left: pgX, top: pgY, source: 'page_xy', confidence: 0.5, degraded: true }
  }

  // 7. viewportX/viewportY fallback (Final fallback)
  if (!result && typeof vpX === 'number' && typeof vpY === 'number' && Number.isFinite(vpX) && Number.isFinite(vpY)) {
    result = { left: vpX + scrollPos.x, top: vpY + scrollPos.y, source: 'viewport_fallback', confidence: 0.2, degraded: true }
  }

  // Diagnostic log requirement
  console.log("STAGE resolve attempt", {
    markerId: (marker as any).id,
    hasSelector: !!selector,
    hasXpath: !!xpath,
    hasBoundingBox: !!marker.boundingBoxAtCapture,
    hasPageXY: pgX != null,
    hasViewportXY: vpX != null,
    resolvedResult: result,
  })

  if (result) {
    console.log(`STAGE pin resolved [${(marker as any).id}] via ${result.source} -> ${result.left},${result.top}`)
    return result
  }

  console.warn(`STAGE pin skipped invalid render position [${(marker as any).id}]`)
  return null
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
  const anchorKind = marker.anchor_kind || (marker as any).anchorKind
  if (anchorKind !== 'dom-relative') {
     const pageX = clientX + currentScroll.x
     const pageY = clientY + currentScroll.y
     return {
       expected_version: marker.version,
       viewport_x: clientX,
       viewport_y: clientY,
       page_x: pageX,
       page_y: pageY,
       scroll_x: currentScroll.x,
       scroll_y: currentScroll.y,
       anchor_mode: 'viewport_fallback',

       viewportX: clientX,
       viewportY: clientY,
       pageX: pageX,
       pageY: pageY,
       scrollXAtCapture: currentScroll.x,
       scrollYAtCapture: currentScroll.y,
       anchorMode: 'viewport_fallback'
     } as Partial<Marker>
  }

  let el: HTMLElement | null = null
  if (iframeDocument) {
    el = iframeDocument.elementFromPoint(clientX, clientY) as HTMLElement | null
    if (!el || el.tagName === 'HTML') {
      el = iframeDocument.body
    }
  }

  if (!el) {
    const pageX = clientX + currentScroll.x
    const pageY = clientY + currentScroll.y
    return {
       expected_version: marker.version,
       viewport_x: clientX,
       viewport_y: clientY,
       page_x: pageX,
       page_y: pageY,
       scroll_x: currentScroll.x,
       scroll_y: currentScroll.y,
       offset_x_ratio: 0.5,
       offset_y_ratio: 0.5,
       anchor_mode: 'viewport_fallback',

       viewportX: clientX,
       viewportY: clientY,
       pageX: pageX,
       pageY: pageY,
       scrollXAtCapture: currentScroll.x,
       scrollYAtCapture: currentScroll.y,
       offsetXRatio: 0.5,
       offsetYRatio: 0.5,
       anchorMode: 'viewport_fallback'
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
    
    // Snake case
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
    anchor_mode: 'dom',

    // Camel case / CanonicalMarkerAnchor
    offsetXRatio: offset_x_ratio,
    offsetYRatio: offset_y_ratio,
    elementSelector: selector,
    xpath: xpath,
    textHint: textExcerpt,
    viewportX: clientX,
    viewportY: clientY,
    pageX: clientX + currentScroll.x,
    pageY: clientY + currentScroll.y,
    scrollXAtCapture: currentScroll.x,
    scrollYAtCapture: currentScroll.y,
    anchorMode: 'dom',
    boundingBoxAtCapture: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    }
  } as Partial<Marker>
}
