import { NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE } from '@/lib/auth/session';

export async function POST() {
  // Clear the admin session cookie to log the user out.
  const res = NextResponse.json({ ok: true });

  res.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });

  return res;
}
