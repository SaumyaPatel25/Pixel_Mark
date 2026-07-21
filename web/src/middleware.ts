import { NextResponse, type NextRequest } from 'next/server'

/**
 * ROUTE GUARD POLICY
 * ─────────────────────────────────────────────────────────────────
 * PUBLIC routes (no auth required):
 *   /               — marketing landing page
 *   /login          — authentication pages
 *   /register       — registration page
 *   /signup         — alias for /register
 *   /auth/*         — auth callbacks and aliases
 *   /review/*       — share-link reviewer overlay pages
 *   /t/*            — share-link token landing pages
 *   /docs/*         — public documentation
 *   /pricing        — public pricing page
 *   /support/*      — public support & diagnostics
 *   /company/*      — public company pages
 *   /faq            — public FAQ
 *   /features       — public features
 *   /getting-started— public getting started guide
 *   /sample-target  — sample target pages
 *   /chrome-extension — extension info
 *   /api/*          — backend API routes
 *
 * PROTECTED routes (require pm_token or pmtoken cookie):
 *   /projects/*     — developer project list
 *   /project/*      — individual project view
 *   /dashboard/*    — dashboard views
 *   /settings/*     — account/API settings
 *   /sessions/*     — session management
 *   /v2/*           — v2 features
 * ─────────────────────────────────────────────────────────────────
 */

const PROTECTED_PREFIXES = [
  '/projects',
  '/project',
  '/dashboard',
  '/settings',
  '/sessions',
  '/v2',
]

const AUTH_ONLY_ROUTES = [
  '/login',
  '/register',
  '/signup',
  '/auth/login',
  '/auth/register',
]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Read developer auth token from cookies (support both pm_token and pmtoken)
  const token = request.cookies.get('pm_token')?.value || request.cookies.get('pmtoken')?.value

  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some(r => path === r || path.startsWith(r + '/'))
  const isProtected = PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))

  // 1. Redirect authenticated users away from login/register back to /dashboard
  if (token && isAuthOnlyRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 2. Redirect unauthenticated users away from protected routes to /login
  if (!token && isProtected) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // 3. For all other routes (public, static, landing), allow access
  return NextResponse.next()
}

export const config = {
  // Match all paths except static files, Next.js internal files, favicon, and image/stylesheet/script extensions
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|overlay.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}

