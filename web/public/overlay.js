// public/overlay.js
;(function () {
  'use strict'

  var scriptEl   = document.currentScript
  var PROJECT_ID = (scriptEl && scriptEl.getAttribute('data-project')) || ''
  var API_BASE   = (scriptEl && scriptEl.getAttribute('data-api'))     || 'http://localhost:8765'

  if (!PROJECT_ID) {
    console.warn('[Overlay] No data-project — markers disabled')
    return
  }

  var ctrlHeld    = false
  var markerCount = 0

  // ── Styles ──────────────────────────────────────────────────────────────
  var style = document.createElement('style')
  style.textContent = [
    '.ex-highlight {',
    '  outline: 2px dashed #a855f7 !important;',
    '  outline-offset: 3px !important;',
    '  cursor: crosshair !important;',
    '  background: rgba(168,85,247,0.06) !important;',
    '}',
    '.ex-marker {',
    '  position: fixed; z-index: 2147483647;',
    '  width: 26px; height: 26px; border-radius: 50%;',
    '  background: #a855f7; border: 2.5px solid #fff;',
    '  color: #fff; font-size: 11px; font-weight: 700;',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-family: monospace; pointer-events: none;',
    '  box-shadow: 0 2px 12px rgba(168,85,247,0.7);',
    '  transform: scale(0); animation: ex-pop 0.2s ease forwards;',
    '}',
    '@keyframes ex-pop {',
    '  0%   { transform: scale(0); opacity: 0; }',
    '  70%  { transform: scale(1.2); }',
    '  100% { transform: scale(1); opacity: 1; }',
    '}',
  ].join('\n')
  document.head.appendChild(style)

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getSelector(el) {
    if (!el || el.nodeType !== 1) return 'unknown'
    if (el.id) return '#' + el.id
    var testid = el.getAttribute('data-testid')
    if (testid) return '[data-testid="' + testid + '"]'
    var name = el.getAttribute('name')
    if (name) return el.tagName.toLowerCase() + '[name="' + name + '"]'
    var classes = []
    for (var i = 0; i < el.classList.length && i < 3; i++) {
      if (el.classList[i].length < 50) classes.push(el.classList[i])
    }
    var base = el.tagName.toLowerCase()
    return classes.length ? base + '.' + classes.join('.') : base
  }

  function getXPath(el) {
    if (!el || el === document.body) return '/html/body'
    var parts = []
    while (el && el.nodeType === 1) {
      var idx = 1
      var sib = el.previousSibling
      while (sib) {
        if (sib.nodeType === 1 && sib.tagName === el.tagName) idx++
        sib = sib.previousSibling
      }
      parts.unshift(el.tagName.toLowerCase() + '[' + idx + ']')
      el = el.parentNode
    }
    return '/' + parts.join('/')
  }

  function postUp(data) {
    try {
      window.parent.postMessage({ source: 'pixelmark-overlay', ...data }, '*')
    } catch(e) {
      console.warn('[Overlay] postMessage failed:', e)
    }
  }

  function dropMarker(x, y, num) {
    var dot = document.createElement('div')
    dot.className   = 'ex-marker'
    dot.textContent = String(num)
    dot.style.left  = (x - 13) + 'px'
    dot.style.top   = (y - 13) + 'px'
    document.body.appendChild(dot)
    return dot
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      ctrlHeld = true
      document.body.style.cursor = 'crosshair'
    }
  })

  document.addEventListener('keyup', function(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      ctrlHeld = false
      document.body.style.cursor = ''
      document.querySelectorAll('.ex-highlight').forEach(function(el) {
        el.classList.remove('ex-highlight')
      })
    }
  })

  // ── Hover ────────────────────────────────────────────────────────────────
  document.addEventListener('mouseover', function(e) {
    if (!ctrlHeld || !e.target || e.target === document.body) return
    document.querySelectorAll('.ex-highlight').forEach(function(el) {
      el.classList.remove('ex-highlight')
    })
    e.target.classList.add('ex-highlight')
  }, { passive: true })

  // ── Click ────────────────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    if (!ctrlHeld) return
    e.preventDefault()
    e.stopPropagation()

    markerCount++
    var el       = e.target
    var rect     = el ? el.getBoundingClientRect() : null
    var selector = getSelector(el)
    var xpath    = getXPath(el)

    dropMarker(e.clientX, e.clientY, markerCount)
    if (el) el.classList.remove('ex-highlight')

    // Send capture request to parent — parent does the screenshot
    postUp({
      type:         'MARKER_DROPPED',
      markerNumber: markerCount,
      projectId:    PROJECT_ID,
      selector:     selector,
      xpath:        xpath,
      tagName:      el ? el.tagName.toLowerCase() : 'unknown',
      innerText:    el ? (el.innerText || '').slice(0, 120).trim() : '',
      pageUrl:      window.location.href,
      clientX:      e.clientX,
      clientY:      e.clientY,
      // Element bounding box relative to iframe viewport
      // Parent will use this to crop the iframe screenshot
      elementRect: rect ? {
        x:      Math.round(rect.x),
        y:      Math.round(rect.y),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
      } : null,
    })
  }, true)

  console.log('[Overlay] ✓ Ready — project:', PROJECT_ID)
})()
