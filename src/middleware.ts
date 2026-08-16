import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from './lib/auth-edge'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for API routes
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Public paths
  if (path === '/admin/login') {
    const token = request.cookies.get('admin_session')?.value

    if (token && (await verifySession(token))) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    return NextResponse.next()
  }

  // Protected admin paths
  if (path.startsWith('/admin')) {
    const token = request.cookies.get('admin_session')?.value
    console.log('[Middleware] Checking path:', path)
    console.log('[Middleware] Token present:', !!token)

    if (!token) {
      console.log('[Middleware] No token found, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const session = await verifySession(token)
    console.log('[Middleware] Session verified:', !!session)

    if (!session) {
      console.log('[Middleware] Invalid session, clearing cookie and redirecting')
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('admin_session')
      return response
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
