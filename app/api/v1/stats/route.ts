/**
 * Public, free, unpriced: adoption stats for the x402 API.
 *
 * Free on purpose. A usage counter behind a paywall is a usage counter
 * nobody can check.
 */

import { NextResponse } from "next/server";
import { getRecentCalls, getStats } from "@/lib/x402/usage";
import { CATALOG, X402_MODE, X402_NETWORK } from "@/lib/x402/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, recent] = await Promise.all([getStats(), getRecentCalls(10)]);

  return NextResponse.json(
    {
      network: X402_NETWORK,
      api_mode: X402_MODE,
      endpoints_live: CATALOG.length,
      usage: stats,
      recent,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
