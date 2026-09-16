import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { isAuthorizedCron } from '@/lib/auth/cron';
import { pingMimo } from '@/lib/llm/client';

/**
 * Deployment diagnostics — the fastest way to confirm a token is actually being read.
 *
 * Public:  GET /api/health            → which variables are present (never their values)
 * Secret:  GET /api/health?deep=1     → also pings MiMo and the database, needs the cron secret
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const present = (key: string) => Boolean(env(key));

export async function GET(req: NextRequest) {
  const config = {
    MIMO_API_KEY: present('MIMO_API_KEY'),
    MIMO_BASE_URL: env('MIMO_BASE_URL', 'https://api.xiaomimimo.com/v1'),
    MIMO_MODEL: env('MIMO_MODEL', 'mimo-v2.5-pro'),
    DATABASE_URL: present('DATABASE_URL'),
    ADMIN_SESSION_SECRET: present('ADMIN_SESSION_SECRET'),
    CRON_SECRET: present('CRON_SECRET'),
    RHC_RPC_URL: present('RHC_RPC_URL'),
    MORPHO_USDG_MARKET_ID: present('MORPHO_USDG_MARKET_ID'),
  };

  if (req.nextUrl.searchParams.get('deep') !== '1') {
    return NextResponse.json({ ok: true, config });
  }

  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'unauthorized — deep check needs the cron secret' }, { status: 401 });
  }

  const [mimo, database] = await Promise.all([
    pingMimo(),
    prisma.$queryRaw`SELECT 1`.then(
      () => ({ ok: true }),
      (err: Error) => ({ ok: false, error: err.message }),
    ),
  ]);

  return NextResponse.json({ ok: mimo.ok && database.ok, config, checks: { mimo, database } });
}
