/**
 * Machine-readable endpoint catalog.
 *
 * This is how an agent discovers Quorum without a human reading docs.
 * Free and uncached — it is the entry point, so it must never 402.
 */

import { NextResponse } from "next/server";
import {
  CATALOG,
  HOLDER_DISCOUNT_MIN,
  HOLDER_DISCOUNT_RATE,
  PAY_TO,
  X402_ASSET_ADDRESS,
  X402_ASSET_DECIMALS,
  X402_ASSET_SYMBOL,
  X402_MODE,
  X402_NETWORK,
  toBaseUnits,
} from "@/lib/x402/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      name: "Quorum",
      description:
        "News, sentiment and risk flags for the Robinhood Chain ecosystem (chain 4663), priced per call over x402.",
      docs: "https://www.quorumchain.news/agents",
      x402Version: 2,
      mode: X402_MODE,
      payment: {
        network: X402_NETWORK,
        asset: X402_ASSET_ADDRESS || null,
        assetSymbol: X402_ASSET_SYMBOL,
        assetDecimals: X402_ASSET_DECIMALS,
        payTo: PAY_TO || null,
        scheme: "exact",
      },
      discounts: [
        {
          id: "quorum_holder",
          description: `Paying wallets holding at least ${HOLDER_DISCOUNT_MIN} $QUORUM pay ${
            HOLDER_DISCOUNT_RATE * 100
          }% of list price. Verified with a live balanceOf call on chain 4663.`,
          rate: HOLDER_DISCOUNT_RATE,
          minBalance: HOLDER_DISCOUNT_MIN,
        },
      ],
      endpoints: CATALOG.map((e) => ({
        id: e.id,
        method: e.method,
        path: e.path,
        summary: e.summary,
        returns: e.returns,
        price: {
          amount: e.price,
          baseUnits: toBaseUnits(e.price),
          asset: X402_ASSET_SYMBOL,
        },
        holderPrice: {
          amount: (Number(e.price) * HOLDER_DISCOUNT_RATE).toFixed(6),
          asset: X402_ASSET_SYMBOL,
        },
      })),
      stats: "/api/v1/stats",
      editorial: {
        verified_data_only: true,
        no_price_predictions: true,
        no_buy_sell_calls: true,
        sources_on_every_number: true,
      },
    },
    { headers: { "cache-control": "no-store" } }
  );
}
