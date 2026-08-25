import { NextResponse, type NextRequest } from 'next/server'
import { isAuthRoute, isProtectedRoute, isPublicRoute } from '@/lib/routes'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const host = request.headers.get('host')
  
  // Strict check to ensure we only enforce canonical domain on true production deployments.
  // NODE_ENV protects local dev. VERCEL_ENV protects preview deployments.
  const isProductionNode = process.env.NODE_ENV === 'production'
  const isVercelProd = process.env.VERCEL_ENV === 'production'
  
  const isLocal = host && (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('::1'))

  // Enforce canonical domain redirect for non-canonical production traffic, allowing both old and new domains
  const allowedHosts = ['stage.entrext.com', 'web-zeta-sable-82.vercel.app']
  
  if (isProductionNode && isVercelProd && host && !allowedHosts.includes(host) && !isLocal) {
    // CRITICAL: We use 307 (Temporary) instead of 301 (Permanent) to prevent browsers from 
    // caching this redirect and poisoning local development if env vars ever leak.
    return NextResponse.redirect(
      new URL(path + request.nextUrl.search, 'https://stage.entrext.com'),
      307
    )
  }

  // Read developer auth token from cookies. Supports new 'stagetoken' and fallback to legacy 'pm_token'/'pmtoken'.
  const token = request.cookies.get('stagetoken')?.value || 
                request.cookies.get('pm_token')?.value || 
                request.cookies.get('pmtoken')?.value

  const isAuthPage = isAuthRoute(path)
  const isProtected = isProtectedRoute(path)
  const isPublic = isPublicRoute(path)

  // Determine if this environment is staging / preview or non-production
  const isStagingDomain = host?.includes('stage.entrext.com') || host?.includes('stge.entrext.com') || host?.includes('vercel.app') || process.env.VERCEL_ENV === 'preview'

  const applySecurityAndSeoHeaders = (res: NextResponse) => {
    if (isStagingDomain) {
      res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    }
    return res
  }

  // 1. Redirect authenticated users away from login/register back to /dashboard
  if (token && isAuthPage) {
    const redirectRes = NextResponse.redirect(new URL('/dashboard', request.url))
    return applySecurityAndSeoHeaders(redirectRes)
  }

  // 2. Redirect unauthenticated users away from protected routes to /login
  if (!token && isProtected) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    const redirectRes = NextResponse.redirect(redirectUrl)
    return applySecurityAndSeoHeaders(redirectRes)
  }

  // 3. For all public or unclassified routes, allow access with appropriate headers
  const nextRes = NextResponse.next()
  return applySecurityAndSeoHeaders(nextRes)
}

export const config = {
  // Match all paths except static files, Next.js internal files, favicon, and image/stylesheet/script extensions
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|overlay.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
