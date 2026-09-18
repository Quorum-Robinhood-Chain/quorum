// Blockscout PRO API client — used ONLY to auto-discover "trending" tokens on
// Robinhood Chain (chain 4663), i.e. whatever ERC-20 contracts are actually
// live/held on-chain right now. This is deliberately separate from:
//   - lib/market/robinhood-assets.ts → Robinhood's own OFFICIAL Stock Token
//     catalog (curated, verified deployments). That stays the source of
//     truth for stock tokens — do not replace it with this.
//   - lib/market/pools.ts → hand-configured DeFi/meme tokens (TOKEN_POOL_MAP).
//
// Docs: https://docs.blockscout.com/devs/pro-api (Robinhood Chain section).
// Get a free API key at https://dev.blockscout.com — required even for the
// free tier. Without BLOCKSCOUT_API_KEY set, every function here becomes a
// safe no-op (see hasBlockscoutConfigured).
//
// IMPORTANT — no legitimacy check: anyone can deploy an ERC-20 on this chain
// with any name/symbol (including copying "Apple", "Robinhood", etc). This
// module is a discovery feed, not a verification service. Callers MUST keep
// filtering (holders count floor, non-null price) rather than trusting
// name/symbol alone, and MUST NOT treat a match here as an official Stock
// Token — see lib/market/sync-trending-tokens.ts for how that's enforced.

import { env, envNumber } from '@/lib/env';

const BLOCKSCOUT_BASE_URL = 'https://api.blockscout.com';

function chainId(): string {
  return env('BLOCKSCOUT_CHAIN_ID') ?? env('RHC_CHAIN_ID', '4663');
}

function apiKey(): string | undefined {
  return env('BLOCKSCOUT_API_KEY');
}

export function hasBlockscoutConfigured(): boolean {
  return Boolean(apiKey());
}

interface BlockscoutTokenItem {
  address_hash: string;
  name: string | null;
  symbol: string | null;
  type: string;
  exchange_rate: string | null;
  circulating_market_cap: string | null;
  holders_count: string | null;
}

export interface TrendingTokenCandidate {
  symbol: string;
  name: string;
  contractAddress: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  holders: number;
}

// Discover ERC-20 tokens live on Robinhood Chain, sorted by Blockscout's
// default (circulating market cap desc.), then filtered down to ones with a
// minimum holder count (BLOCKSCOUT_MIN_HOLDERS, default 25) — a cheap floor
// against single-wallet/self-airdropped copycat tokens. This is NOT identity
// verification; it just keeps out the most obvious noise.
export async function fetchTrendingTokenCandidates(
  limit = 25,
): Promise<TrendingTokenCandidate[]> {
  const key = apiKey();

  if (!key) {
    throw new Error('BLOCKSCOUT_API_KEY not set — see .env.example');
  }

  const url = `${BLOCKSCOUT_BASE_URL}/${chainId()}/api/v2/tokens?type=ERC-20&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`Blockscout /tokens HTTP ${res.status}`);
  }

  const data = (await res.json()) as { items: BlockscoutTokenItem[] };
  const minHolders = envNumber('BLOCKSCOUT_MIN_HOLDERS', 25);

  return data.items
    .filter((item) => item.symbol && item.name && item.address_hash)
    .map(
      (item): TrendingTokenCandidate => ({
        symbol: item.symbol as string,
        name: item.name as string,
        contractAddress: item.address_hash,
        priceUsd: item.exchange_rate != null ? Number(item.exchange_rate) : null,
        marketCapUsd:
          item.circulating_market_cap != null
            ? Number(item.circulating_market_cap)
            : null,
        holders: item.holders_count != null ? Number(item.holders_count) : 0,
      }),
    )
    .filter((t) => t.holders >= minHolders)
    .slice(0, limit);
}

export interface TrendingTokenQuote {
  priceUsd: number | null;
  marketCapUsd: number | null;
  error?: string;
}

// Cheap single-token re-fetch for the 5-minute price refresh cycle (see
// lib/market/refresh.ts) — avoids re-running full discovery every tick.
export async function fetchTrendingTokenQuote(
  contractAddress: string,
): Promise<TrendingTokenQuote> {
  const key = apiKey();

  if (!key) {
    return { priceUsd: null, marketCapUsd: null, error: 'BLOCKSCOUT_API_KEY not set' };
  }

  try {
    const url = `${BLOCKSCOUT_BASE_URL}/${chainId()}/api/v2/tokens/${contractAddress}?apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return {
        priceUsd: null,
        marketCapUsd: null,
        error: `Blockscout /tokens/{address} HTTP ${res.status}`,
      };
    }

    const item = (await res.json()) as BlockscoutTokenItem;

    return {
      priceUsd: item.exchange_rate != null ? Number(item.exchange_rate) : null,
      marketCapUsd:
        item.circulating_market_cap != null
          ? Number(item.circulating_market_cap)
          : null,
    };
  } catch (err) {
    return { priceUsd: null, marketCapUsd: null, error: (err as Error).message };
  }
}
