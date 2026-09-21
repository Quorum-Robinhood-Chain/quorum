import { NextRequest, NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/auth/session';
import { getReviewQueuePresentation } from '@/lib/presenters/review-queue';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify the admin session before exposing the review queue.
  const username = await requireAdminSession(req);

  if (!username) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Fetch the current review queue and live data status.
  const { articles, usingLiveData } = await getReviewQueuePresentation();

  return NextResponse.json({ articles, usingLiveData });
}
