import { describe, it, expect } from 'vitest'
import { getProxyPageUrl, buildProxyPageUrl } from '../utils/proxyRoutes'

const API_BASE = 'http://127.0.0.1:8765/'
const SESSION_ID = 'e2318b3b-80aa-41e2-973b-95a9c6d9bff1'
const TARGET_URL = 'https://sohospace.entrext.in'

// ─── buildProxyPageUrl (discriminated union) ──────────────────────────────────

describe('buildProxyPageUrl — discriminated union builder', () => {
  it('returns ok:true with correct page?url= when valid sessionId + url', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, TARGET_URL)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.url).toBe(
      `http://127.0.0.1:8765/proxy/session/${SESSION_ID}/page?url=${encodeURIComponent(TARGET_URL)}`
    )
  })

  it('encodes target URL exactly once (not double-encoded)', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, TARGET_URL)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    // The encoded form appears once; decoding once returns the original URL
    const encodedPart = res.url.split('?url=')[1].split('&')[0]
    expect(decodeURIComponent(encodedPart)).toBe(TARGET_URL)
  })

  it('preserves target URL path and query', () => {
    const urlWithPath = 'https://sohospace.entrext.in/features?ref=stage&plan=pro'
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, urlWithPath)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.url).toContain(`url=${encodeURIComponent(urlWithPath)}`)
    // Decoded back to original
    const encoded = new URL(res.url).searchParams.get('url')
    expect(encoded).toBe(urlWithPath)
  })

  it('appends shareToken correctly', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, TARGET_URL, 'token-abc')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.url).toContain('&share_token=token-abc')
  })

  it('strips trailing slash from apiBase', () => {
    const res = buildProxyPageUrl('http://127.0.0.1:8765/', SESSION_ID, TARGET_URL)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.url).not.toContain('//proxy')
  })

  it('adds https:// when target URL has no scheme', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, 'sohospace.entrext.in')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.url).toContain(encodeURIComponent('https://sohospace.entrext.in'))
  })

  it('returns ok:false when targetUrl is null', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, null)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('targetUrl is required')
  })

  it('returns ok:false when targetUrl is empty string', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, '')
    expect(res.ok).toBe(false)
  })

  it('returns ok:false when targetUrl is whitespace only', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, '   ')
    expect(res.ok).toBe(false)
  })

  it('returns ok:false when sessionId is missing', () => {
    const res = buildProxyPageUrl(API_BASE, '', TARGET_URL)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('sessionId is required')
  })

  // Critical: never produces bare /proxy/session/{id} or /page-only URLs
  it('NEVER returns /proxy/session/{id} (bare route)', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, null)
    if (res.ok) {
      expect(res.url).not.toMatch(/\/proxy\/session\/[^/]+$/)
      expect(res.url).toContain('/page?url=')
    }
    // ok:false also acceptable — both prevent the bare route
  })

  it('NEVER returns /proxy/session/{id}/page without ?url=', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, null)
    if (res.ok) {
      expect(res.url).not.toMatch(/\/page$/)
      expect(res.url).not.toMatch(/\/page\?[^u]/)
    }
  })

  it('NEVER includes snapshot_mode=true in default session proxy URLs', () => {
    const res = buildProxyPageUrl(API_BASE, SESSION_ID, TARGET_URL)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.url).not.toContain('snapshot_mode=true')
      expect(res.url).not.toContain('snapshot_mode=1')
    }
  })
})

// ─── getProxyPageUrl (legacy compat helper) ────────────────────────────────────

describe('getProxyPageUrl — legacy string helper', () => {
  it('returns correct URL when targetUrl is provided', () => {
    const url = getProxyPageUrl(API_BASE, SESSION_ID, TARGET_URL)
    expect(url).toBe(
      `http://127.0.0.1:8765/proxy/session/${SESSION_ID}/page?url=${encodeURIComponent(TARGET_URL)}`
    )
  })

  it('returns correct URL with share token', () => {
    const url = getProxyPageUrl(API_BASE, SESSION_ID, TARGET_URL, 'token-123')
    expect(url).toBe(
      `http://127.0.0.1:8765/proxy/session/${SESSION_ID}/page?url=${encodeURIComponent(TARGET_URL)}&share_token=token-123`
    )
  })

  it('returns null (NOT empty string) when targetUrl is null', () => {
    const url = getProxyPageUrl(API_BASE, SESSION_ID, null)
    expect(url).toBeNull()
    // Crucially: must not be ''
    expect(url).not.toBe('')
  })

  it('returns null (NOT empty string) when targetUrl is undefined', () => {
    const url = getProxyPageUrl(API_BASE, SESSION_ID, undefined)
    expect(url).toBeNull()
    expect(url).not.toBe('')
  })

  it('returns null (NOT empty string) when targetUrl is empty string', () => {
    const url = getProxyPageUrl(API_BASE, SESSION_ID, '')
    expect(url).toBeNull()
    expect(url).not.toBe('')
  })

  it('returns null when sessionId is missing', () => {
    const url = getProxyPageUrl(API_BASE, '', TARGET_URL)
    expect(url).toBeNull()
  })

  it('correctly encodes URL with special characters', () => {
    const complexUrl = 'https://example.com/path?foo=bar&baz=qux#section'
    const url = getProxyPageUrl(API_BASE, SESSION_ID, complexUrl)
    expect(url).not.toBeNull()
    expect(url).toContain(encodeURIComponent(complexUrl))
    // Verify roundtrip decode
    const paramPart = url!.split('?url=')[1].split('&share_token')[0]
    expect(decodeURIComponent(paramPart)).toBe(complexUrl)
  })
})
