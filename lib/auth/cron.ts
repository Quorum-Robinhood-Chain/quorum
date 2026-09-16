import type { NextRequest } from 'next/server';

import { env } from '@/lib/env';

// Verify cron requests using the configured Vercel or manual trigger secret.
export function isAuthorizedCron(req: NextRequest): boolean {
  const vercelSecret = env('CRON_SECRET');
  const manualSecret = env('CRON_TRIGGER_SECRET');

  const bearer = req.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim();

  if (vercelSecret && bearer === vercelSecret) return true;

  const headerSecret = req.headers.get('x-cron-secret')?.trim();

  return Boolean(manualSecret && headerSecret === manualSecret);
}
