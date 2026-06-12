export type CaptureStatus = 'draft' | 'submitted' | 'failed' | 'resolved' | 'archived'

export type CapturePayload = {
  id: string
  status: CaptureStatus
  createdVia: string
  timestamp: string
  sessionId: string | null
  pageUrl: string
  pageTitle: string
  rendererType: string
  persistedId?: string | null
  renderedPosition?: { left: number; top: number; source: string } | null

  issueTypeHint: string | null
  issueType: string | null
  priority: string | null
  userComment: string

  coordinates: {
    pageX: number | null
    pageY: number | null
    viewportX: number | null
    viewportY: number | null
    normX: number | null
    normY: number | null
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
  const status: CaptureStatus = ['draft', 'submitted', 'failed'].includes(raw.status) ? raw.status : 'draft'

  // Resolve pageUrl: prefer logical URL
  let pageUrl = raw.pageUrl || raw.pageurl || raw.page_url || ''
  if (pageUrl && pageUrl.includes('/proxy/session/')) {
    try {
      const urlObj = new URL(pageUrl, 'http://localhost')
      const targetQuery = urlObj.searchParams.get('url')
      if (targetQuery) {
        pageUrl = decodeURIComponent(targetQuery)
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  const singleScreenshot = raw.screenshotdataurl || raw.screenshotDataUrl || raw.screenshot_data_url || null

  return {
    id,
    status,
    createdVia: raw.createdVia || raw.createdvia || raw.created_via || 'unknown',
    timestamp: raw.timestamp || new Date().toISOString(),
    sessionId: raw.sessionId || raw.sessionid || raw.session_id || null,
    pageUrl,
    pageTitle: raw.pageTitle || raw.pagetitle || raw.page_title || '',
    rendererType: raw.rendererType || raw.renderertype || raw.renderer_type || 'dom',
    persistedId: raw.persistedId || raw.persistedid || raw.persisted_id || (status === 'submitted' || raw.persistedId ? id : null),
    renderedPosition: raw.renderedPosition || raw.renderedposition || raw.rendered_position || null,

    issueTypeHint: raw.issueTypeHint || raw.issuetypehint || raw.issue_type_hint || null,
    issueType: raw.issueType || raw.issuetype || raw.issue_type || raw.issueTypeHint || raw.issuetypehint || raw.issue_type_hint || null,
    priority: raw.priority || 'medium',
    userComment: raw.userComment || raw.usercomment || raw.user_comment || '',

    coordinates: {
      pageX: raw.coordinates?.pageX ?? raw.pageX ?? raw.x ?? raw.click?.page_x ?? raw.click?.pageX ?? null,
      pageY: raw.coordinates?.pageY ?? raw.pageY ?? raw.y ?? raw.click?.page_y ?? raw.click?.pageY ?? null,
      viewportX: raw.coordinates?.viewportX ?? raw.viewportX ?? raw.viewportx ?? raw.viewport_x ?? raw.click?.client_x ?? raw.click?.viewport_x ?? raw.click?.viewportX ?? null,
      viewportY: raw.coordinates?.viewportY ?? raw.viewportY ?? raw.viewporty ?? raw.viewport_y ?? raw.click?.client_y ?? raw.click?.viewport_y ?? raw.click?.viewportY ?? null,
      normX: raw.coordinates?.normX ?? raw.normX ?? raw.normx ?? raw.norm_x ?? raw.click?.norm_x ?? raw.click?.normX ?? null,
      normY: raw.coordinates?.normY ?? raw.normY ?? raw.normy ?? raw.norm_y ?? raw.click?.norm_y ?? raw.click?.normY ?? null,
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
      width: raw.viewport?.width ?? (raw.viewport?.width) ?? null,
      height: raw.viewport?.height ?? (raw.viewport?.height) ?? null,
      devicePixelRatio: raw.viewport?.devicePixelRatio ?? raw.devicePixelRatio ?? raw.devicepixelratio ?? raw.device_pixel_ratio ?? null,
      scrollX: raw.viewport?.scrollX ?? raw.scrollX ?? raw.scrollx ?? raw.scroll_x ?? raw.scrollPosition?.x ?? raw.scroll_position?.x ?? null,
      scrollY: raw.viewport?.scrollY ?? raw.scrollY ?? raw.scrolly ?? raw.scroll_y ?? raw.scrollPosition?.y ?? raw.scroll_position?.y ?? null,
      colorScheme: raw.viewport?.colorScheme ?? raw.colorScheme ?? raw.colorscheme ?? raw.color_scheme ?? null,
      touchSupport: raw.viewport?.touchSupport ?? raw.touchSupport ?? null,
    },

    canvasContext: raw.canvasContext || raw.canvascontext || raw.canvas_context || raw.click?.canvas_context || raw.click?.canvasContext || null,
    agentVersion: raw.agentVersion || raw.agentversion || raw.agent_version || null,
    submissionError: raw.submissionError || raw.submissionerror || raw.submission_error || null,
  }
}
