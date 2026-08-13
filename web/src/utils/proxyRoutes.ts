/**
 * STAGE Proxy Route Construction Utility
 * Canonical source of truth for all session proxy URL construction.
 *
 * Rules enforced here:
 *  - NEVER returns an empty string
 *  - NEVER returns the bare /proxy/session/{id} route
 *  - NEVER returns /proxy/session/{id}/page without ?url=
 *  - Encodes the target URL exactly once via encodeURIComponent
 *  - Preserves path, query, and hash on the target URL
 *  - Accepts optional shareToken appended as &share_token=
 */

export type ProxyUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Build a fully-qualified page proxy URL.
 * Returns a discriminated union so callers are forced to handle the
 * missing-targetUrl case explicitly rather than silently swallowing it.
 */
export function buildProxyPageUrl(
  apiBase: string,
  sessionId: string,
  targetUrl: string | null | undefined,
  shareToken?: string | null
): ProxyUrlResult {
  if (!sessionId || sessionId.trim() === '') {
    return { ok: false, error: 'STAGE: sessionId is required to build a proxy URL' }
  }

  if (!targetUrl || targetUrl.trim() === '') {
    return {
      ok: false,
      error: `STAGE: targetUrl is required to build a proxy URL for session ${sessionId}. ` +
             `Cannot construct /proxy/session/${sessionId}/page without ?url=.`
    }
  }

  // Normalise: ensure targetUrl has a scheme so encodeURIComponent doesn't
  // silently drop the protocol when the value is a bare hostname.
  let normalizedUrl = targetUrl.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const cleanApiBase = apiBase.replace(/\/$/, '')
  const shareParam = shareToken ? `&share_token=${shareToken}` : ''

  return {
    ok: true,
    url: `${cleanApiBase}/proxy/session/${sessionId}/page?url=${encodeURIComponent(normalizedUrl)}${shareParam}`
  }
}

/**
 * Legacy compatibility helper — wraps buildProxyPageUrl and returns a string.
 * When targetUrl is missing, returns null (never '').
 * Callers must guard: if (url === null) { show placeholder }
 */
export function getProxyPageUrl(
  apiBase: string,
  sessionId: string,
  targetUrl?: string | null,
  shareToken?: string | null
): string | null {
  const result = buildProxyPageUrl(apiBase, sessionId, targetUrl, shareToken)
  if (!result.ok) {
    console.error('[STAGE proxyRoutes]', result.error)
    return null
  }
  return result.url
}
