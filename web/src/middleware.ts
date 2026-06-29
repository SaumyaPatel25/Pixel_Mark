import { NextResponse, type NextRequest } from 'next/server'

// Routes that require auth
const PROTECTED = ['/projects', '/project', '/dashboard', '/settings', '/sessions']

// Routes only for unauthenticated users
const AUTH_ONLY = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // We use pm_token cookie for auth instead of Supabase
  const token = request.cookies.get('pm_token')?.value

  // Redirect unauthenticated users away from protected routes
  if (!token && PROTECTED.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(path), request.url))
  }

  // Redirect authenticated users away from auth pages
  if (token && AUTH_ONLY.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/projects', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|overlay.js|api).*)'],
}
