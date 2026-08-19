export type IssueType =
  | 'layout'
  | 'copy'
  | 'interaction'
  | 'navigation'
  | 'rendering'
  | 'canvas_webgl'
  | 'other'

export interface ClassificationContext {
  element_tag?: string | null
  element_selector?: string | null
  element_text?: string | null
  aria_role?: string | null
  aria_label?: string | null
  renderer_type?: string | null
  canvas_context?: any | null
  console_errors?: any[] | null
  network_errors?: any[] | null
}

const TEXT_KEYWORDS: Record<IssueType, RegExp> = {
  canvas_webgl: /\b(3d|webgl|three\.?js|canvas|mesh|model|geometry|texture|shader|scene|orbit|render|camera|raycast)\b/i,
  copy: /\b(typo|spelling|grammar|wording|misspelled|text|headline|font|punctuation|sentence|paragraph|label|copy)\b/i,
  interaction: /\b(click|hover|press|tap|submit|disabled|unresponsive|frozen|drag|dropdown|modal|popup|open|close|toggle|input|type|scroll)\b/i,
  navigation: /\b(link|redirect|route|router|url|page|navigate|404|broken\s*link|href|anchor|back|forward)\b/i,
  rendering: /\b(glitch|flicker|black\s*screen|white\s*screen|invisible|hidden|blurry|distorted|video|image|photo|svg|asset|fail|crash|error)\b/i,
  layout: /\b(align|alignment|spacing|margin|padding|overlap|overlapping|cut\s*off|overflow|mobile|responsive|width|height|grid|flex|shifted|center|gap)\b/i,
  other: /^$/
}

const INTERACTIVE_TAGS = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'form',
  'option',
  'optgroup',
  'fieldset',
  'details',
  'summary'
])

const INTERACTIVE_ROLES = new Set([
  'button',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'tab',
  'combobox',
  'menuitem',
  'textbox',
  'searchbox'
])

const NAVIGATION_TAGS = new Set([
  'a',
  'nav',
  'menu',
  'link'
])

const NAVIGATION_ROLES = new Set([
  'link',
  'navigation',
  'tablist',
  'menubar'
])

const TEXT_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'label', 'blockquote',
  'em', 'strong', 'b', 'i', 'small',
  'caption', 'code', 'pre', 'time',
  'cite', 'q', 'mark', 'abbr', 'address',
  'li', 'dt', 'dd'
])

const MEDIA_TAGS = new Set([
  'img',
  'svg',
  'video',
  'picture',
  'figure',
  'figcaption',
  'audio',
  'source',
  'track',
  'iframe'
])

const WEBGL_RENDERERS = new Set([
  'webgl',
  'threejs',
  'canvas2d',
  'canvas'
])

/**
 * Deterministic, multi-signal inference for issue type.
 * Evaluates WebGL/Canvas context, DOM tags/roles, telemetry errors, and user text.
 */
export function inferIssueType(
  ctx?: ClassificationContext | null,
  title?: string | null,
  note?: string | null
): IssueType {
  const combinedText = `${title || ''} ${note || ''}`.trim()

  // 1. If explicit strong text match in title/notes, prioritize user's written intent
  if (combinedText) {
    for (const [type, regex] of Object.entries(TEXT_KEYWORDS) as [IssueType, RegExp][]) {
      if (type !== 'other' && regex.test(combinedText)) {
        return type
      }
    }
  }

  if (!ctx) return 'layout'

  const renderer = (ctx.renderer_type || '').toLowerCase()
  const tag = (ctx.element_tag || '').toLowerCase().replace(/^[<>/]+|[<>/]+$/g, '')
  const role = (ctx.aria_role || '').toLowerCase()
  const selector = (ctx.element_selector || '').toLowerCase()

  // 2. WebGL / Canvas / 3D detection
  if (WEBGL_RENDERERS.has(renderer) || ctx.canvas_context || tag === 'canvas') {
    return 'canvas_webgl'
  }

  // 3. Navigation detection
  if (NAVIGATION_TAGS.has(tag) || NAVIGATION_ROLES.has(role) || selector.includes('nav') || selector.includes('menu') || selector.includes('link')) {
    return 'navigation'
  }

  // 4. Interactive control detection
  if (INTERACTIVE_TAGS.has(tag) || INTERACTIVE_ROLES.has(role) || selector.includes('btn') || selector.includes('button') || selector.includes('input')) {
    return 'interaction'
  }

  // 5. Media & visual assets detection
  if (MEDIA_TAGS.has(tag) || selector.includes('img') || selector.includes('icon') || selector.includes('avatar') || selector.includes('logo')) {
    return 'rendering'
  }

  // 6. Text & Copy detection
  if (TEXT_TAGS.has(tag) || (ctx.element_text && ctx.element_text.length > 5 && (tag === 'div' || tag === 'span' || tag === ''))) {
    return 'copy'
  }

  // 7. Error telemetry triggers
  if ((ctx.console_errors && ctx.console_errors.length > 0) || (ctx.network_errors && ctx.network_errors.length > 0)) {
    return 'rendering'
  }

  // 8. Default fallback for layout / structural containers
  return 'layout'
}
