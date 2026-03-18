import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 登录页不拦截
  if (pathname === '/houtai/login' || pathname.startsWith('/houtai/login/')) {
    return NextResponse.next()
  }

  // 其他 admin 页面需要认证
  if (pathname.startsWith('/houtai/')) {
    const sessionCookie = request.cookies.get('next-auth.session-token') ||
                          request.cookies.get('__Secure-next-auth.session-token')

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/houtai/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/houtai/:path*'],
}
