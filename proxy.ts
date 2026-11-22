import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, SESSION_COOKIE_NAME } from './lib/session'

// Next.js 16 Proxy Convention
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignore static assets and Next internal files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await decrypt(token)
  const isAuthenticated = Boolean(session?.userId)

  // 1. Root route: redirect authenticated users to /dashboard, unauthenticated to /login
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 2. Dashboard routes: protected (Admin only)
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 3. Admin API routes: protected (Admin only)
  if (pathname.startsWith('/api/admin')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // 4. Login page: redirect authenticated admin to /dashboard
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 5. Public participant meeting link routes (/join/*, /api/meetings/*, /api/auth/*)
  // External participants can join without accounts!
  return NextResponse.next()
}

// Next.js 16 supports proxy as named export or default export
export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
