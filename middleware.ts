import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

// Gate for the editorial dashboard. Scheduled jobs live under /api/cron and authenticate
// with their own secret, so they are never matched here.
const PUBLIC_PATHS = ['/admin/login', '/api/admin/login', '/api/admin/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const username = await verifySessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (username) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
