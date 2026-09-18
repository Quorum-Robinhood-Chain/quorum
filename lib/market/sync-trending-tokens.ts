import { prisma } from '@/lib/db';
import {
  fetchTrendingTokenCandidates,
  hasBlockscoutConfigured,
} from './blockscout';

export interface TrendingTokenSyncResult {
  discovered: number;
  upserted: number;
  removed: number;
  tracked: string[];
  skipped?: string;
}

// Sync the Token table's `trending` rows against whatever's actually live on
// Robinhood Chain right now, via Blockscout's indexer (lib/market/blockscout.ts).
//
// This is intentionally the ONLY fully auto-discovered token category:
//   - stock_token comes from Robinhood's own curated catalog (sync-stock-tokens.ts)
//   - defi/meme come from hand-configured pools (TOKEN_POOL_MAP in .env)
//   - trending (this file) needs zero manual config — new tokens show up on
//     their own, which is the whole point of "what's happening on-chain now".
//
// Run this every few hours (see .github/workflows/cron.yml) rather than on
// every 5-minute `market` tick — discovery is the expensive full-list call;
// `market` only re-prices whichever ones are already tracked (see
// lib/market/refresh.ts).
export async function syncTrendingTokens(): Promise<TrendingTokenSyncResult> {
  if (!hasBlockscoutConfigured()) {
    return {
      discovered: 0,
      upserted: 0,
      removed: 0,
      tracked: [],
      skipped: 'BLOCKSCOUT_API_KEY not set — see .env.example',
    };
  }

  const candidates = await fetchTrendingTokenCandidates(10);

  // Never duplicate a token Robinhood already lists officially as a Stock
  // Token — if Blockscout surfaces the same contract address, the official
  // catalog stays the source of truth for it (name, verification, etc).
  const stockTokenAddresses = new Set(
    (
      await prisma.token.findMany({
        where: { category: 'stock_token' },
        select: { contractAddress: true },
      })
    )
      .map((t) => t.contractAddress?.toLowerCase())
      .filter((a): a is string => Boolean(a)),
  );

  const fresh = candidates.filter(
    (c) => !stockTokenAddresses.has(c.contractAddress.toLowerCase()),
  );
  const freshAddresses = new Set(fresh.map((c) => c.contractAddress.toLowerCase()));

  // Drop previously-tracked trending tokens that fell out of the current
  // discovery window (no longer enough holders, delisted, etc).
  const existing = await prisma.token.findMany({ where: { category: 'trending' } });
  const stale = existing.filter(
    (t) => !t.contractAddress || !freshAddresses.has(t.contractAddress.toLowerCase()),
  );

  if (stale.length > 0) {
    await prisma.token.deleteMany({ where: { id: { in: stale.map((t) => t.id) } } });
  }

  for (const candidate of fresh) {
    await prisma.token.upsert({
      where: {
        symbol_contractAddress: {
          symbol: candidate.symbol,
          contractAddress: candidate.contractAddress,
        },
      },
      update: { name: candidate.name, dex: 'Robinhood Chain (Blockscout)' },
      create: {
        symbol: candidate.symbol,
        name: candidate.name,
        contractAddress: candidate.contractAddress,
        dex: 'Robinhood Chain (Blockscout)',
        category: 'trending',
        coingeckoId: null,
        isTracked: true,
      },
    });
  }

  return {
    discovered: candidates.length,
    upserted: fresh.length,
    removed: stale.length,
    tracked: fresh.map((c) => c.symbol),
  };
}
