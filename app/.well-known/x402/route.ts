/**
 * /.well-known/x402 — discovery document.
 *
 * Agents crawling for paid data sources look here before they look at a
 * hero section. Keep it free, keep it uncached.
 */

import { NextResponse } from "next/server";
import {
  CATALOG,
  PAY_TO,
  X402_ASSET_ADDRESS,
  X402_ASSET_SYMBOL,
  X402_MODE,
  X402_NETWORK,
  toBaseUnits,
} from "@/lib/x402/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      x402Version: 2,
      provider: "Quorum",
      mode: X402_MODE,
      catalog: "/api/catalog",
      stats: "/api/v1/stats",
      networks: [
        {
          network: X402_NETWORK,
          asset: X402_ASSET_ADDRESS || null,
          assetSymbol: X402_ASSET_SYMBOL,
          payTo: PAY_TO || null,
          scheme: "exact",
        },
      ],
      resources: CATALOG.map((e) => ({
        path: e.path,
        method: e.method,
        maxAmountRequired: toBaseUnits(e.price),
        amountDecimal: e.price,
        description: e.summary,
      })),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
