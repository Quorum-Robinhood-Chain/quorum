/**
 * Quorum x402 — endpoint catalog & payment configuration.
 *
 * Every priced endpoint is declared here once. /api/catalog serves this
 * verbatim so an agent can discover pricing without reading any docs.
 */

import { env, envNumber } from "@/lib/env";

/** Robinhood Chain, CAIP-2 form. */
export const X402_NETWORK = "eip155:4663";
export const X402_CHAIN_ID = 4663;

/** USDG on Robinhood Chain. Set before enabling live mode. */
export const X402_ASSET_ADDRESS = env("X402_ASSET_ADDRESS", "");
export const X402_ASSET_SYMBOL = "USDG";
export const X402_ASSET_DECIMALS = 6;

/** Payment recipient. */
export const PAY_TO = env("X402_PAY_TO", "");

/**
 * Live mode requires BOTH an explicit opt-in and a configured recipient.
 * Until then every priced route answers 402 with mode "dev-preview" and
 * honours the dev bypass header. It never silently charges, and never
 * silently opens.
 */
export const X402_LIVE =
  env("X402_MODE") === "live" && PAY_TO !== "" && X402_ASSET_ADDRESS !== "";

export const X402_MODE: "live" | "dev-preview" = X402_LIVE ? "live" : "dev-preview";

/** Shared secret for the dev preview bypass (X-Quorum-Dev-Key). */
export const DEV_PREVIEW_KEY = env("X402_DEV_KEY", "");

/**
 * Agents whose wallet holds >= this much $QUORUM pay the discounted rate.
 * Reads the SAME var as the reader-side gate (lib/wallet/quorumToken.ts) so
 * one threshold governs both — kept as a number here since callers do
 * arithmetic with it; toString() where the catalog/page want to print it.
 */
export const HOLDER_DISCOUNT_MIN_NUM = envNumber("QUORUM_MIN_BALANCE", 50_000);
export const HOLDER_DISCOUNT_MIN = String(HOLDER_DISCOUNT_MIN_NUM);
export const HOLDER_DISCOUNT_RATE = 0.5;

/** Max paid calls a single payer address may make per rolling minute. */
export const RATE_LIMIT_PER_MINUTE = envNumber("X402_RATE_LIMIT_PER_MIN", 30);

export type EndpointId = "news" | "sentiment" | "flags" | "pulse" | "snapshot";

export interface EndpointSpec {
  id: EndpointId;
  path: string;
  method: "GET";
  /** Price in USDG as a decimal string. */
  price: string;
  summary: string;
  /** What the caller gets back, for the catalog. */
  returns: string[];
}

export const CATALOG: EndpointSpec[] = [
  {
    id: "news",
    path: "/api/v1/news",
    method: "GET",
    price: "0.01",
    summary:
      "Latest verified Robinhood Chain stories, relevance-filtered, with sources.",
    returns: ["headline", "dek", "category", "published_at", "sources"],
  },
  {
    id: "sentiment",
    path: "/api/v1/sentiment/{token}",
    method: "GET",
    price: "0.005",
    summary:
      "Sentiment score (-2..+2) plus its components: 24h price delta and buy share.",
    returns: ["score", "tone", "price_change_24h", "buy_share", "as_of"],
  },
  {
    id: "flags",
    path: "/api/v1/flags/{token}",
    method: "GET",
    price: "0.005",
    summary:
      "Risk flags: thin liquidity, volume-to-liquidity ratio, one-sided flow.",
    returns: ["flags", "liquidity_usd", "volume_24h_usd", "vol_to_liq", "txns_24h"],
  },
  {
    id: "pulse",
    path: "/api/v1/pulse",
    method: "GET",
    price: "0.01",
    summary: "Chain-wide market tone: risk-on / mixed / risk-off.",
    returns: ["tone", "avg_score", "bullish", "bearish", "tokens_scored"],
  },
  {
    id: "snapshot",
    path: "/api/v1/snapshot",
    method: "GET",
    price: "0.01",
    summary: "TVL, 24h DEX volume and Stock Token movers from the latest snapshot.",
    returns: ["tvl_usd", "dex_volume_24h_usd", "dex_volume_rank", "movers"],
  },
];

export function findEndpoint(id: EndpointId): EndpointSpec {
  const spec = CATALOG.find((e) => e.id === id);
  if (!spec) throw new Error(`Unknown endpoint: ${id}`);
  return spec;
}

/** Price for this caller, after any holder discount. */
export function priceFor(spec: EndpointSpec, isHolder: boolean): string {
  if (!isHolder) return spec.price;
  return trimZeros((Number(spec.price) * HOLDER_DISCOUNT_RATE).toFixed(6));
}

/** Decimal USDG string -> base units string (6 decimals). */
export function toBaseUnits(price: string): string {
  const [whole, frac = ""] = price.split(".");
  const padded = (frac + "0".repeat(X402_ASSET_DECIMALS)).slice(
    0,
    X402_ASSET_DECIMALS
  );
  return BigInt(whole + padded).toString();
}

function trimZeros(s: string): string {
  return s.replace(/0+$/, "").replace(/\.$/, "");
}
