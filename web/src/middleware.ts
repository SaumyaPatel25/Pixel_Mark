import { NextResponse, type NextRequest } from 'next/server'

/**
 * ROUTE GUARD POLICY
 * ─────────────────────────────────────────────────────────────────
 * PUBLIC routes (no auth required):
 *   /review/*       — share-link reviewer overlay pages
 *   /t/*            — share-link token landing pages (collect reviewer name + resolve token)
 *   /login          — authentication pages
 *   /signup         — signup pages
 *   /docs/*         — public documentation
 *   /pricing        — public pricing page
 *   /support        — public support page
 *   / (root)        — marketing landing page
 *
 * PROTECTED routes (require pm_token cookie):
 *   /projects/*     — developer project list
 *   /project/*      — individual project view
 *   /dashboard/*    — dashboard views
 *   /settings/*     — account/API settings
 *   /sessions/*     — session management (developer only)
 *
 * NOTE: /review/* and /t/* intentionally bypass pm_token checks.
 * Reviewers authenticate via the reviewer identity system (per-session sessionStorage),
 * not via developer login cookies. Adding pm_token guards to these routes
 * would break the public review share-link experience.
 * ─────────────────────────────────────────────────────────────────
 */

// Routes that require a developer pm_token cookie
const PROTECTED_PREFIXES = [
  '/projects',
  '/project',
  '/dashboard',
  '/settings',
  '/sessions',
]

// Routes that redirect authenticated (pm_token) users away (auth-only screens)
const AUTH_ONLY_PREFIXES = ['/login', '/signup']

// Routes explicitly allowed without any auth — never redirect these
const ALWAYS_PUBLIC_PREFIXES = [
  '/review',   // Share-link reviewer overlay — reviewer auth is session-scoped
  '/t',        // Token landing pages — resolve token and collect reviewer name
  '/docs',
  '/pricing',
  '/support',
  '/api',      // API routes handled by backend
]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Always allow public paths first — do not redirect even if token is missing
  if (ALWAYS_PUBLIC_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'))) {
    return NextResponse.next()
  }

  // Read developer auth token from cookie
  const token = request.cookies.get('pm_token')?.value

  // Redirect unauthenticated users away from protected routes
  if (!token && PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from login/signup back to app
  if (token && AUTH_ONLY_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/projects', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Match all paths except:
  //   _next/static    — Next.js static files
  //   _next/image     — Next.js image optimization
  //   favicon.ico     — Browser favicon
  //   overlay.js      — PixelMark browser extension overlay bundle
  matcher: ['/((?!_next/static|_next/image|favicon.ico|overlay.js).*)'],
}
