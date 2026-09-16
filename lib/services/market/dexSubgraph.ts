// Token-level volume/price across Robinhood Chain DEXs (§7.2): Arcus, Uniswap, 1inch, Lighter.
//
// IMPORTANT: unlike DefiLlama/CoinGecko/Morpho, there is no single standard endpoint shape
// across these four — each DEX exposes its own subgraph or REST API, and the exact URL for
// each *on Robinhood Chain specifically* needs to be confirmed (new chain, indexers may lag
// launch). Rather than guess wrong endpoints, this module defines one adapter per DEX behind
// a common interface, each reading its own env var, and returns an explicit `configured: false`
// result until that env var is filled in. Wire up the real query per DEX once confirmed.

export interface DexTokenVolume {
  dex: "arcus" | "uniswap" | "1inch" | "lighter";
  configured: boolean;
  tokens: Array<{
    symbol: string;
    contractAddress: string;
    priceUsd: number | null;
    volume24hUsd: number | null;
    change24hPct: number | null;
  }>;
  error?: string;
}

/** Uniswap: standard Graph subgraph (subgraph.thegraph.com or a Uniswap-hosted equivalent per chain). */
export async function fetchUniswapTokenVolume(): Promise<DexTokenVolume> {
  const url = process.env.UNISWAP_SUBGRAPH_URL;
  if (!url) return { dex: "uniswap", configured: false, tokens: [], error: "UNISWAP_SUBGRAPH_URL not set" };

  const query = /* GraphQL */ `
    {
      tokens(first: 25, orderBy: volumeUSD, orderDirection: desc) {
        symbol
        id
        derivedETH
        volumeUSD
      }
    }
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 0 },
  });
  if (!res.ok) return { dex: "uniswap", configured: true, tokens: [], error: `HTTP ${res.status}` };

  const json = await res.json();
  const tokens = (json?.data?.tokens ?? []).map((t: any) => ({
    symbol: t.symbol,
    contractAddress: t.id,
    priceUsd: null, // derive from derivedETH * ETH/USD if needed
    volume24hUsd: Number(t.volumeUSD) || null,
    change24hPct: null,
  }));

  return { dex: "uniswap", configured: true, tokens };
}

/** Arcus (dYdX team's DEX) — endpoint/schema to be confirmed with the team or their docs. */
export async function fetchArcusTokenVolume(): Promise<DexTokenVolume> {
  const url = process.env.ARCUS_SUBGRAPH_URL;
  if (!url) return { dex: "arcus", configured: false, tokens: [], error: "ARCUS_SUBGRAPH_URL not set" };

  // Placeholder shape — replace with Arcus's actual query once their subgraph/API is confirmed.
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return { dex: "arcus", configured: true, tokens: [], error: `HTTP ${res.status}` };
    const json = await res.json();
    return { dex: "arcus", configured: true, tokens: json.tokens ?? [] };
  } catch (err) {
    return { dex: "arcus", configured: true, tokens: [], error: (err as Error).message };
  }
}

/** 1inch aggregator — typically their public price/quote API rather than a subgraph. */
export async function fetchOneInchTokenVolume(): Promise<DexTokenVolume> {
  const url = process.env.ONEINCH_API_URL;
  if (!url) return { dex: "1inch", configured: false, tokens: [], error: "ONEINCH_API_URL not set" };

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return { dex: "1inch", configured: true, tokens: [], error: `HTTP ${res.status}` };
    const json = await res.json();
    return { dex: "1inch", configured: true, tokens: json.tokens ?? [] };
  } catch (err) {
    return { dex: "1inch", configured: true, tokens: [], error: (err as Error).message };
  }
}

/** Lighter (orderbook-style exchange) — likely a REST API rather than a subgraph. */
export async function fetchLighterTokenVolume(): Promise<DexTokenVolume> {
  const url = process.env.LIGHTER_API_URL;
  if (!url) return { dex: "lighter", configured: false, tokens: [], error: "LIGHTER_API_URL not set" };

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return { dex: "lighter", configured: true, tokens: [], error: `HTTP ${res.status}` };
    const json = await res.json();
    return { dex: "lighter", configured: true, tokens: json.tokens ?? [] };
  } catch (err) {
    return { dex: "lighter", configured: true, tokens: [], error: (err as Error).message };
  }
}

export async function fetchAllDexVolumes(): Promise<DexTokenVolume[]> {
  return Promise.all([
    fetchUniswapTokenVolume(),
    fetchArcusTokenVolume(),
    fetchOneInchTokenVolume(),
    fetchLighterTokenVolume(),
  ]);
}
