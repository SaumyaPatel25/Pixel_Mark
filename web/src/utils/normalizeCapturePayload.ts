export type CaptureStatus = 'draft' | 'new' | 'triaged' | 'in_progress' | 'resolved' | 'dismissed' | 'failed' | 'submitted' | 'archived'

export type CapturePayload = {
  // Direct Store Fields
  id: string
  sessionId: string | null
  pageUrl: string
  displayX: number
  displayY: number
  pageX: number
  pageY: number
  bboxLeft: number | null
  bboxTop: number | null
  bboxWidth: number | null
  bboxHeight: number | null
  selector: string | null
  xpath: string | null
  issueType: string | null
  note: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  visible: boolean
  isNormalized?: boolean

  // Compatibility fields
  status: CaptureStatus
  createdVia: string
  timestamp: string
  pageTitle: string
  rendererType: string
  persistedId?: string | null
  renderedPosition?: { left: number; top: number; source: string } | null
  priority: string | null
  userComment: string

  coordinates: {
    pageX: number | null
    pageY: number | null
    viewportX: number | null
    viewportY: number | null
    normX: number | null
    normY: number | null
    displayX?: number | null
    displayY?: number | null
    clientX?: number | null
    clientY?: number | null
    isNormalized?: boolean
  }

  target: {
    tagName: string | null
    text: string | null
    selector: string | null
    xpath: string | null
    ariaLabel: string | null
    ariaRole: string | null
    elementId: string | null
    classList: string[]
    isVisible: boolean | null
  }

  boundingBox: {
    x: number | null
    y: number | null
    width: number | null
    height: number | null
    top: number | null
    right: number | null
    bottom: number | null
    left: number | null
  } | null

  source: {
    htmlSnippet: string | null
    outerHtml: string | null
    shadowPath: string | null
    shadowHostTag: string | null
    shadowHostId: string | null
    shadowHostClassList: string[]
  }

  screenshots: {
    fullPageDataUrl: string | null
    cropDataUrl: string | null
    targetDataUrl: string | null
    canvasSnapshot: string | null
    screenshotRequired: boolean
  }

  diagnostics: {
    consoleErrors: any[]
    networkErrors: any[]
    browserInfo: Record<string, any> | null
  }

  viewport: {
    width: number | null
    height: number | null
    devicePixelRatio: number | null
    scrollX: number | null
    scrollY: number | null
    colorScheme: string | null
    touchSupport: number | null
  }

  canvasContext: Record<string, any> | null
  agentVersion: string | null
  submissionError: string | null

  domsnapshot?: Record<string, any> | null
  canvasdomsnapshot?: Record<string, any> | null
  screenshottype?: string | null
  screenshotttype?: string | null
  screenshotsource?: string | null
  screenshottimestamp?: string | null
  screenshotdataurl?: string | null
  screenshotrequired?: boolean
  title?: string | null
  description?: string | null
  tags?: string | null
}

export function normalizeMarkerCoordinates(eventOrPayload: any): {
  displayX: number
  displayY: number
  pageX: number
  pageY: number
  clientX: number
  clientY: number
  source: string
} {
  console.log('[Markers] normalizeMarkerCoordinates raw input:', eventOrPayload)

  let displayX = 0
  let displayY = 0
  let pageX = 0
  let pageY = 0
  let clientXVal = 0
  let clientYVal = 0
  let source = 'unknown'

  // 1. Check if it's a DOM click event (MouseEvent) or looks like one
  const isDomEvent = eventOrPayload && (
    typeof eventOrPayload.clientX === 'number' && 
    typeof eventOrPayload.clientY === 'number'
  )

  if (isDomEvent) {
    const rawClientX = eventOrPayload.clientX
    const rawClientY = eventOrPayload.clientY
    
    // Check if target is iframe element
    const target = eventOrPayload.target
    const isIframeTarget = target && target.tagName === 'IFRAME'

    if (isIframeTarget) {
      const rect = target.getBoundingClientRect()
      displayX = rawClientX + rect.left
      displayY = rawClientY + rect.top
      clientXVal = rawClientX
      clientYVal = rawClientY
      source = 'iframe_dom_event_translated'
    } else {
      let iframeLeft = 0
      let iframeTop = 0
      if (typeof document !== 'undefined') {
        const iframe = document.getElementById('pixelmark-proxy-iframe') || document.querySelector('iframe')
        if (iframe) {
          const rect = iframe.getBoundingClientRect()
          iframeLeft = rect.left
          iframeTop = rect.top
        }
      }
      displayX = rawClientX
      displayY = rawClientY
      clientXVal = rawClientX - iframeLeft
      clientYVal = rawClientY - iframeTop
      source = 'viewport_dom_event'
    }

    pageX = eventOrPayload.pageX ?? (rawClientX + (typeof window !== 'undefined' ? window.scrollX : 0))
    pageY = eventOrPayload.pageY ?? (rawClientY + (typeof window !== 'undefined' ? window.scrollY : 0))
  } else {
    // 2. It's a prebuilt payload
    const p = eventOrPayload || {}
    
    const createdVia = p.createdVia || p.createdvia || p.created_via || ''
    const isFromIframe = createdVia === 'agent' || createdVia === 'alt_click' || createdVia === 'alt-click' || createdVia === 'feedback-mode'
    
    const alreadyNormalized = p.isNormalized || p.coordinates?.isNormalized || p.status === 'submitted' || p.status === 'resolved' || !!p.persistedId || !!p.persisted_id

    // Extract client/viewport X/Y
    let cX = p.displayX ?? p.display_x ?? p.click?.client_x ?? p.click?.viewport_x ?? p.click?.viewportX ?? p.coordinates?.viewportX ?? p.coordinates?.displayX ?? null
    let cY = p.displayY ?? p.display_y ?? p.click?.client_y ?? p.click?.viewport_y ?? p.click?.viewportY ?? p.coordinates?.viewportY ?? p.coordinates?.displayY ?? null

    // Fallbacks if displayX/displayY or viewport coordinates are missing but page coordinates exist
    if (cX === null || cY === null) {
      const pgX = p.pageX ?? p.page_x ?? p.x ?? p.click?.page_x ?? p.coordinates?.pageX ?? 0
      const pgY = p.pageY ?? p.page_y ?? p.y ?? p.click?.page_y ?? p.coordinates?.pageY ?? 0
      const scrollX = p.viewport?.scrollX ?? p.scroll_position?.x ?? 0
      const scrollY = p.viewport?.scrollY ?? p.scroll_position?.y ?? 0
      cX = pgX - scrollX
      cY = pgY - scrollY
      source = 'page_scroll_fallback'
    } else {
      source = 'prebuilt_payload'
    }

    let iframeLeft = 0
    let iframeTop = 0
    if (typeof document !== 'undefined') {
      const iframe = document.getElementById('pixelmark-proxy-iframe') || document.querySelector('iframe')
      if (iframe) {
        const rect = iframe.getBoundingClientRect()
        iframeLeft = rect.left
        iframeTop = rect.top
      }
    }

    if (isFromIframe && !alreadyNormalized) {
      displayX = cX + iframeLeft
      displayY = cY + iframeTop
      clientXVal = cX
      clientYVal = cY
      source = 'iframe_payload_translated'
    } else {
      displayX = cX
      displayY = cY
      clientXVal = cX - iframeLeft
      clientYVal = cY - iframeTop
      if (alreadyNormalized) {
        source = 'already_normalized'
      }
    }

    pageX = p.pageX ?? p.page_x ?? p.click?.page_x ?? p.coordinates?.pageX ?? (displayX + (typeof window !== 'undefined' ? window.scrollX : 0))
    pageY = p.pageY ?? p.page_y ?? p.click?.page_y ?? p.coordinates?.pageY ?? (displayY + (typeof window !== 'undefined' ? window.scrollY : 0))
  }

  // Clamp to parent window viewport bounds
  if (typeof window !== 'undefined') {
    displayX = Math.max(0, Math.min(window.innerWidth, displayX))
    displayY = Math.max(0, Math.min(window.innerHeight, displayY))
  }

  const output = {
    displayX: Math.round(displayX),
    displayY: Math.round(displayY),
    pageX: Math.round(pageX),
    pageY: Math.round(pageY),
    clientX: Math.round(clientXVal),
    clientY: Math.round(clientYVal),
    source
  }

  console.log('[Markers] normalizeMarkerCoordinates final output:', output)
  return output
}

export function normalizeCapturePayload(raw: any): CapturePayload {
  if (!raw || typeof raw !== 'object') {
    raw = {}
  }

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `capture_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  const id = typeof raw.id === 'string' ? raw.id : generateId()
  const status: CaptureStatus = ['draft', 'submitted', 'failed', 'resolved', 'archived'].includes(raw.status) ? raw.status : 'draft'

  let pageUrl = raw.pageUrl || raw.pageurl || raw.page_url || ''
  if (pageUrl && pageUrl.includes('/proxy/session/')) {
    try {
      const urlObj = new URL(pageUrl, 'http://localhost')
      const targetQuery = urlObj.searchParams.get('url')
      if (targetQuery) {
        pageUrl = decodeURIComponent(targetQuery)
      }
    } catch (e) {
      // Ignore
    }
  }

  // Run coordinates normalization
  const stable = normalizeMarkerCoordinates(raw)

  const singleScreenshot = raw.screenshotdataurl || raw.screenshotDataUrl || raw.screenshot_data_url || null

  const commentValue = raw.note ?? raw.userComment ?? raw.usercomment ?? raw.user_comment ?? raw.comment ?? ''

  return {
    // Direct Store Fields
    id,
    sessionId: raw.sessionId || raw.sessionid || raw.session_id || null,
    pageUrl,
    displayX: stable.displayX,
    displayY: stable.displayY,
    pageX: stable.pageX,
    pageY: stable.pageY,
    bboxLeft: raw.bboxLeft ?? raw.boundingBox?.left ?? raw.boundingBox?.x ?? null,
    bboxTop: raw.bboxTop ?? raw.boundingBox?.top ?? raw.boundingBox?.y ?? null,
    bboxWidth: raw.bboxWidth ?? raw.boundingBox?.width ?? null,
    bboxHeight: raw.bboxHeight ?? raw.boundingBox?.height ?? null,
    selector: raw.selector ?? raw.target?.selector ?? raw.elementSelector ?? raw.elementselector ?? raw.element_selector ?? null,
    xpath: raw.xpath ?? raw.target?.xpath ?? null,
    issueType: raw.issueType ?? raw.issuetype ?? raw.issue_type ?? raw.issueTypeHint ?? raw.issue_type_hint ?? null,
    note: commentValue,
    createdAt: raw.createdAt ?? raw.timestamp ?? raw.createdat ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updatedat ?? raw.updated_at ?? new Date().toISOString(),
    deletedAt: raw.deletedAt ?? raw.deletedat ?? raw.deleted_at ?? null,
    visible: raw.visible ?? (raw.deletedAt || raw.deletedat || raw.deleted_at ? false : true),
    isNormalized: true,

    // Compatibility fields
    status,
    createdVia: raw.createdVia || raw.createdvia || raw.created_via || 'unknown',
    timestamp: raw.timestamp || raw.createdAt || raw.createdat || raw.created_at || new Date().toISOString(),
    pageTitle: raw.pageTitle || raw.pagetitle || raw.page_title || '',
    rendererType: raw.rendererType || raw.renderertype || raw.renderer_type || 'dom',
    persistedId: raw.persistedId || raw.persistedid || raw.persisted_id || (status === 'submitted' || raw.persistedId ? id : null),
    renderedPosition: raw.renderedPosition || raw.renderedposition || raw.rendered_position || null,
    priority: raw.priority || 'medium',
    userComment: commentValue,

    coordinates: {
      pageX: stable.pageX,
      pageY: stable.pageY,
      viewportX: stable.displayX,
      viewportY: stable.displayY,
      clientX: stable.clientX,
      clientY: stable.clientY,
      normX: raw.coordinates?.normX ?? raw.normX ?? raw.normx ?? raw.norm_x ?? null,
      normY: raw.coordinates?.normY ?? raw.normY ?? raw.normy ?? raw.norm_y ?? null,
      displayX: stable.displayX,
      displayY: stable.displayY,
      isNormalized: true,
    },

    target: {
      tagName: raw.target?.tagName ?? raw.elementTag ?? raw.elementtag ?? raw.element_tag ?? null,
      text: raw.target?.text ?? raw.elementText ?? raw.elementtext ?? raw.element_text ?? null,
      selector: raw.target?.selector ?? raw.elementSelector ?? raw.elementselector ?? raw.element_selector ?? null,
      xpath: raw.target?.xpath ?? raw.xpath ?? null,
      ariaLabel: raw.target?.ariaLabel ?? raw.ariaLabel ?? raw.arialabel ?? raw.aria_label ?? null,
      ariaRole: raw.target?.ariaRole ?? raw.ariaRole ?? raw.ariarole ?? raw.aria_role ?? null,
      elementId: raw.target?.elementId ?? raw.elementId ?? raw.elementid ?? raw.element_id ?? null,
      classList: Array.isArray(raw.target?.classList) ? raw.target.classList : [],
      isVisible: raw.target?.isVisible ?? true,
    },

    boundingBox: raw.boundingBox || raw.boundingbox || raw.bounding_box || null,

    source: {
      htmlSnippet: raw.source?.htmlSnippet ?? raw.htmlSnippet ?? raw.htmlsnippet ?? raw.html_snippet ?? null,
      outerHtml: raw.source?.outerHtml ?? raw.outerHtml ?? raw.outerhtml ?? raw.outer_html ?? null,
      shadowPath: raw.source?.shadowPath ?? raw.shadowPath ?? raw.shadowpath ?? raw.shadow_path ?? null,
      shadowHostTag: raw.source?.shadowHostTag ?? raw.shadowHostTag ?? raw.shadowhosttag ?? raw.shadow_host_tag ?? null,
      shadowHostId: raw.source?.shadowHostId ?? raw.shadowHostId ?? raw.shadowhostid ?? raw.shadow_host_id ?? null,
      shadowHostClassList: Array.isArray(raw.source?.shadowHostClassList) ? raw.source.shadowHostClassList : (raw.shadowHostClassList || raw.shadowhostclasslist || raw.shadow_host_class_list || []),
    },

    screenshots: {
      fullPageDataUrl: raw.screenshots?.fullPageDataUrl ?? raw.fullPageDataUrl ?? raw.fullpagedataurl ?? raw.full_page_data_url ?? null,
      cropDataUrl: raw.screenshots?.cropDataUrl ?? raw.cropDataUrl ?? raw.cropdataurl ?? raw.crop_data_url ?? singleScreenshot,
      targetDataUrl: raw.screenshots?.targetDataUrl ?? raw.targetDataUrl ?? raw.targetdataurl ?? raw.target_data_url ?? null,
      canvasSnapshot: raw.screenshots?.canvasSnapshot ?? raw.canvasSnapshot ?? raw.canvassnapshot ?? raw.canvas_snapshot ?? null,
      screenshotRequired: raw.screenshots?.screenshotRequired ?? raw.screenshotRequired ?? raw.screenshotrequired ?? raw.screenshot_required ?? false,
    },

    diagnostics: {
      consoleErrors: Array.isArray(raw.diagnostics?.consoleErrors) ? raw.diagnostics.consoleErrors : (Array.isArray(raw.consoleErrors || raw.consoleerrors || raw.console_errors) ? (raw.consoleErrors || raw.consoleerrors || raw.console_errors) : []),
      networkErrors: Array.isArray(raw.diagnostics?.networkErrors) ? raw.diagnostics.networkErrors : (Array.isArray(raw.networkErrors || raw.networkerrors || raw.network_errors) ? (raw.networkErrors || raw.networkerrors || raw.network_errors) : []),
      browserInfo: raw.diagnostics?.browserInfo ?? raw.browserInfo ?? raw.browserinfo ?? raw.browser_info ?? null,
    },

    viewport: {
      width: raw.viewport?.width ?? null,
      height: raw.viewport?.height ?? null,
      devicePixelRatio: raw.viewport?.devicePixelRatio ?? raw.devicepixelratio ?? raw.device_pixel_ratio ?? null,
      scrollX: raw.viewport?.scrollX ?? raw.viewport?.scroll_position?.x ?? raw.viewport_context?.scroll_position?.x ?? raw.scrollx ?? raw.scroll_x ?? raw.scrollPosition?.x ?? raw.scroll_position?.x ?? null,
      scrollY: raw.viewport?.scrollY ?? raw.viewport?.scroll_position?.y ?? raw.viewport_context?.scroll_position?.y ?? raw.scrolly ?? raw.scroll_y ?? raw.scrollPosition?.y ?? raw.scroll_position?.y ?? null,
      colorScheme: raw.viewport?.colorScheme ?? raw.colorScheme ?? raw.colorscheme ?? raw.color_scheme ?? null,
      touchSupport: raw.viewport?.touchSupport ?? null,
    },

    canvasContext: (() => {
      let ctx = raw.canvasContext || raw.canvascontext || raw.canvas_context || raw.click?.canvas_context || raw.click?.canvasContext || null
      if (ctx && typeof ctx === 'object') {
        if (!ctx.hit_detail && (ctx.object_name || ctx.objectName || ctx.distance !== undefined)) {
          ctx = {
            ...ctx,
            hit_detail: {
              object_name: ctx.object_name || ctx.objectName || null,
              object_type: ctx.object_type || ctx.objectType || null,
              distance: ctx.distance !== undefined ? ctx.distance : null,
            }
          }
        }
      }
      return ctx
    })(),
    agentVersion: raw.agentVersion || raw.agentversion || raw.agent_version || null,
    submissionError: raw.submissionError || raw.submissionerror || raw.submission_error || null,

    domsnapshot: raw.domsnapshot || raw.domSnapshot || raw.dom_snapshot || null,
    canvasdomsnapshot: raw.canvasdomsnapshot || raw.canvasDomSnapshot || raw.canvas_dom_snapshot || null,
    screenshottype: raw.screenshottype || raw.screenshotType || raw.screenshot_type || raw.screenshotttype || raw.screenshotsource || null,
    screenshotttype: raw.screenshotttype || raw.screenshottype || raw.screenshotType || raw.screenshot_type || raw.screenshotsource || null,
    screenshotsource: raw.screenshotsource || raw.screenshottype || raw.screenshotttype || null,
    screenshottimestamp: raw.screenshottimestamp || raw.screenshotTimestamp || raw.screenshot_timestamp || null,
    screenshotdataurl: raw.screenshotdataurl || raw.screenshotDataUrl || raw.screenshot_data_url || raw.screenshots?.cropDataUrl || null,
    screenshotrequired: raw.screenshotrequired ?? raw.screenshot_required ?? raw.screenshots?.screenshotRequired ?? false,
    title: raw.title ?? raw.capturepayload?.title ?? raw.issueTitle ?? null,
    description: raw.description ?? raw.capturepayload?.description ?? raw.issueDescription ?? raw.comment ?? raw.note ?? raw.userComment ?? '',
    tags: raw.tags ?? raw.capturepayload?.tags ?? null,
  }
}
