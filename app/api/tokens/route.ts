import { NextResponse } from 'next/server';

import { getTokensPresentation } from '@/lib/presenters/tokens';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Fetch token data and live data status.
  const { tokens, usingLiveData } = await getTokensPresentation();

  return NextResponse.json({ tokens, usingLiveData });
}
