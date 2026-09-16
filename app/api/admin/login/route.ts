import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, getAdminCredentials } from '@/lib/auth/session';
import { isProduction } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const credentials = getAdminCredentials();
  if (username !== credentials.username || password !== credentials.password) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
