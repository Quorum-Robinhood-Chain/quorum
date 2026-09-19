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
  pairAddress: string | null;
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
