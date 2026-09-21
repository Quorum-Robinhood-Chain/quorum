import { NextResponse } from 'next/server';

import { getTickerPresentation } from '@/lib/presenters/ticker';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Fetch the latest ticker market data.
  const data = await getTickerPresentation();

  return NextResponse.json(data);
}
