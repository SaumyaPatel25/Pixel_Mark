/**
 * STAGE Centralized Route Classification System
 * Single source of truth for public, auth, callback, and protected routes.
 */

export const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/faq',
  '/features',
  '/getting-started',
  '/sample-target',
  '/chrome-extension',
]

export const PUBLIC_PREFIXES = [
  '/docs',
  '/support',
  '/company',
  '/share-links',
  '/review',
  '/t',
]

export const AUTH_ROUTES = [
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/login',
  '/auth/register',
]

export const AUTH_CALLBACK_PREFIXES = [
  '/auth',
  '/api/auth',
]

export const PROTECTED_PREFIXES = [
  '/projects',
  '/project',
  '/dashboard',
  '/settings',
  '/sessions',
  '/v2',
  '/canvas',
  '/billing',
]

/**
 * Returns true if the given path is a public marketing/docs/support page.
 */
export function isPublicRoute(pathname: string): boolean {
  if (!pathname) return false
  const cleanPath = pathname.split('?')[0].split('#')[0]

  if (PUBLIC_ROUTES.includes(cleanPath)) return true
  if (PUBLIC_PREFIXES.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + '/'))) return true
  return false
}

/**
 * Returns true if the given path is an auth login/register/password-reset page.
 */
export function isAuthRoute(pathname: string): boolean {
  if (!pathname) return false
  const cleanPath = pathname.split('?')[0].split('#')[0]

  if (AUTH_ROUTES.includes(cleanPath)) return true
  return false
}

/**
 * Returns true if the given path is an OAuth callback or auth processing route.
 */
export function isAuthCallbackRoute(pathname: string): boolean {
  if (!pathname) return false
  const cleanPath = pathname.split('?')[0].split('#')[0]

  return AUTH_CALLBACK_PREFIXES.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + '/'))
}

/**
 * Returns true if the given path requires developer/user authentication.
 */
export function isProtectedRoute(pathname: string): boolean {
  if (!pathname) return false
  const cleanPath = pathname.split('?')[0].split('#')[0]

  return PROTECTED_PREFIXES.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + '/'))
}
