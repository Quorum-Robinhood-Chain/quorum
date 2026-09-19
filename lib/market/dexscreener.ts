// Dexscreener public REST API client — the single source of truth for
// DeFi/meme/trending token market data (price, 24h volume, 24h % change).
//
// Docs: https://docs.dexscreener.com/api/reference
// No API key needed. Rate limit: 300 requests/min for pair & token endpoints.
//
// Why this replaces the old RPC-reserve math + Blockscout price-only calls:
// the numbers shown on the site now come from the exact same place as the
// "Tokens in this story" link (see lib/market/external-links.ts), so a
// reader who clicks through sees the same price/volume they just read here
// instead of a different figure from a different source.

const DEXSCREENER_API_BASE = 'https://api.dexscreener.com';

// Must match the chain slug used in lib/market/external-links.ts — both are
// "which Dexscreener chain is Robinhood Chain" and MUST stay in sync.
export const DEXSCREENER_CHAIN_SLUG = 'robinhood';

interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[] | null;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string | null;
  volume?: Record<string, number>;
  priceChange?: Record<string, number> | null;
  liquidity?: { usd: number | null; base: number; quote: number } | null;
  txns?: Record<string, { buys: number; sells: number }> | null;
}

export interface DexscreenerSnapshot {
  priceUsd: number | null;
  volume24hUsd: number | null;
  priceChange24hPct: number | null;
  // Which Dexscreener pair this snapshot came from — useful for error
  // messages, and matches the exact page the "Tokens in this story" link
  // sends readers to (dexscreener.com/{chain}/{pairAddress}).
  pairAddress: string | null;
  // Liquidity of that pair — used by sync-trending-tokens.ts to re-verify a
  // token directly (per-address lookup) instead of trusting whether it still
  // shows up in the noisy /token-profiles/latest/v1 window (see the comment
  // on fetchTrendingTokenCandidates below for why that feed is unreliable
  // for "is this still a legitimate, liquid trending token" on its own).
  liquidityUsd: number | null;
  error?: string;
}

const EMPTY: Omit<DexscreenerSnapshot, 'error'> = {
  priceUsd: null,
  volume24hUsd: null,
  priceChange24hPct: null,
  pairAddress: null,
  liquidityUsd: null,
};

function toSnapshot(pair: DexscreenerPair | undefined): DexscreenerSnapshot {
  if (!pair) {
    return { ...EMPTY, error: 'no pair returned by Dexscreener' };
  }

  const priceUsd = pair.priceUsd != null ? Number(pair.priceUsd) : null;

  return {
    priceUsd: Number.isFinite(priceUsd as number) ? priceUsd : null,
    volume24hUsd: pair.volume?.h24 ?? null,
    priceChange24hPct: pair.priceChange?.h24 ?? null,
    pairAddress: pair.pairAddress,
    liquidityUsd: pair.liquidity?.usd ?? null,
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // Market data goes stale fast; never serve a cached copy across ticks.
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Dexscreener ${res.status} ${res.statusText} for ${url}`);
  }

  return res.json();
}

// Look up a single, already-known trading pair by its own contract address —
// this is the exact address behind a dexscreener.com/{chain}/{pairAddress}
// page. Use this for defi/meme tokens whose pair address is configured in
// TOKEN_POOL_MAP (the `pool` field — see lib/market/pools.ts).
export async function fetchDexscreenerPairByAddress(
  pairAddress: string,
): Promise<DexscreenerSnapshot> {
  try {
    const data = (await getJson(
      `${DEXSCREENER_API_BASE}/latest/dex/pairs/${DEXSCREENER_CHAIN_SLUG}/${pairAddress}`,
    )) as { pairs?: DexscreenerPair[] | null };

    return toSnapshot(data.pairs?.[0]);
  } catch (err) {
    return { ...EMPTY, error: (err as Error).message };
  }
}

// Look up every pair trading a given token's contract address, and return
// the most liquid one — the same pair Dexscreener itself surfaces first.
// Use this for trending tokens, which only have a token contract address
// (from discovery — see fetchTrendingTokenCandidates below), not a
// hand-configured pair address.
export async function fetchDexscreenerPairByTokenAddress(
  tokenAddress: string,
): Promise<DexscreenerSnapshot> {
  try {
    const pairs = (await getJson(
      `${DEXSCREENER_API_BASE}/token-pairs/v1/${DEXSCREENER_CHAIN_SLUG}/${tokenAddress}`,
    )) as DexscreenerPair[] | null;

    if (!pairs || pairs.length === 0) {
      return { ...EMPTY, error: 'no pairs found for this token address' };
    }

    const mostLiquid = [...pairs].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0];

    return toSnapshot(mostLiquid);
  } catch (err) {
    return { ...EMPTY, error: (err as Error).message };
  }
}

// 24h trading activity for a token's most liquid pair — used by the
// `market_pulse` article template (lib/market/pulse.ts) to measure buy/sell
// pressure. Every number here is straight from Dexscreener; nothing is estimated.
export interface DexscreenerActivity {
  pairAddress: string;
  pairUrl: string;
  priceUsd: number | null;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
}

export async function fetchDexscreenerActivityByTokenAddress(
  tokenAddress: string,
): Promise<DexscreenerActivity | null> {
  try {
    const pairs = (await getJson(
      `${DEXSCREENER_API_BASE}/token-pairs/v1/${DEXSCREENER_CHAIN_SLUG}/${tokenAddress}`,
    )) as DexscreenerPair[] | null;

    if (!pairs || pairs.length === 0) return null;

    const best = [...pairs].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0];

    const priceUsd = best.priceUsd != null ? Number(best.priceUsd) : null;

    return {
      pairAddress: best.pairAddress,
      pairUrl:
        best.url ??
        `https://dexscreener.com/${DEXSCREENER_CHAIN_SLUG}/${best.pairAddress}`,
      priceUsd: Number.isFinite(priceUsd as number) ? priceUsd : null,
      priceChange24hPct: best.priceChange?.h24 ?? null,
      volume24hUsd: best.volume?.h24 ?? null,
      liquidityUsd: best.liquidity?.usd ?? null,
      buys24h: best.txns?.h24?.buys ?? null,
      sells24h: best.txns?.h24?.sells ?? null,
    };
  } catch {
    return null;
  }
}

export interface TrendingTokenCandidate {
  symbol: string;
  name: string;
  contractAddress: string;
  priceUsd: number | null;
  liquidityUsd: number;
}

interface TokenProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
}

// Discover ERC-20 tokens live on Robinhood Chain via Dexscreener, replacing
// the previous Blockscout-based discovery (lib/market/blockscout.ts).
//
// /token-profiles/latest/v1 lists the newest submitted token profiles
// across ALL chains and takes no chainId/address filter, so step one is
// fetching that list and keeping only entries where chainId matches
// DEXSCREENER_CHAIN_SLUG. That endpoint has no symbol/name/price fields
// though (just address + metadata) — so step two batches those addresses
// through /tokens/v1/{chainId}/{tokenAddresses} (up to 30 per call) to get
// each one's actual pair data (symbol, name, price, liquidity).
//
// IMPORTANT — no legitimacy check: anyone can deploy an ERC-20 on this chain
// with any name/symbol (including copying "Apple", "Robinhood", etc), and
// submitting a Dexscreener token profile doesn't vet that either. This
// module is a discovery feed, not a verification service. By design (per
// product decision) this does NOT filter by liquidity — every Robinhood
// Chain token that has a Dexscreener profile AND at least one tradeable
// pair is surfaced, no matter how thin that pair is. Callers MUST NOT treat
// a match here as an official Stock Token — see
// lib/market/sync-trending-tokens.ts for how that's enforced.
//
// Caveat vs. the old Blockscout source: this only surfaces tokens that have
// submitted a Dexscreener profile, not every ERC-20 that's actually live/
// held on-chain — so it's a narrower, opt-in discovery feed rather than an
// exhaustive one.
export async function fetchTrendingTokenCandidates(): Promise<
  TrendingTokenCandidate[]
> {
  const profiles = (await getJson(
    `${DEXSCREENER_API_BASE}/token-profiles/latest/v1`,
  )) as TokenProfile[] | null;

  const addresses = Array.from(
    new Set(
      (profiles ?? [])
        .filter((p) => p.chainId === DEXSCREENER_CHAIN_SLUG)
        .map((p) => p.tokenAddress),
    ),
  ).slice(0, 30); // /tokens/v1 batch limit is 30 addresses per call

  if (addresses.length === 0) return [];

  const pairs = (await getJson(
    `${DEXSCREENER_API_BASE}/tokens/v1/${DEXSCREENER_CHAIN_SLUG}/${addresses.join(',')}`,
  )) as DexscreenerPair[] | null;

  // A token can trade on more than one DEX/pair — keep only the most liquid
  // pair per base-token address, the same "pick the canonical pair" logic
  // used by fetchDexscreenerPairByTokenAddress above. This is just picking
  // which pair represents the token, NOT a liquidity floor — no pair is
  // excluded for being thin.
  const bestPairByAddress = new Map<string, DexscreenerPair>();

  for (const pair of pairs ?? []) {
    const addr = pair.baseToken.address.toLowerCase();
    const existing = bestPairByAddress.get(addr);

    if (
      !existing ||
      (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)
    ) {
      bestPairByAddress.set(addr, pair);
    }
  }

  return Array.from(bestPairByAddress.values())
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
    .map((pair) => ({
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      contractAddress: pair.baseToken.address,
      priceUsd: pair.priceUsd != null ? Number(pair.priceUsd) : null,
      liquidityUsd: pair.liquidity?.usd ?? 0,
    }));
}
