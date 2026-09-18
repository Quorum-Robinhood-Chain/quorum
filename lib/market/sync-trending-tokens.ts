import { prisma } from '@/lib/db';
import {
  fetchDexscreenerPairByTokenAddress,
  fetchTrendingTokenCandidates,
} from './dexscreener';

export interface TrendingTokenSyncResult {
  discovered: number;
  upserted: number;
  removed: number;
  verifiedKept: number;
  tracked: string[];
  skipped?: string;
}

// Sync the Token table's `trending` rows against whatever's actually live on
// Robinhood Chain right now, via Dexscreener (lib/market/dexscreener.ts —
// no API key needed, unlike the Blockscout source this replaced).
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
  const candidates = await fetchTrendingTokenCandidates();

  if (candidates.length === 0) {
    // Dexscreener's latest-profiles feed can legitimately come back empty
    // for this chain on a given run (see the caveat in dexscreener.ts) —
    // treat that as "nothing new to sync" rather than wiping out every
    // previously-tracked trending token.
    return {
      discovered: 0,
      upserted: 0,
      removed: 0,
      verifiedKept: 0,
      tracked: [],
      skipped: 'no Robinhood Chain candidates from Dexscreener this run',
    };
  }

  // Never duplicate a token that already exists under another category —
  // Stock Token (Robinhood's own catalog), or defi/meme (hand-configured via
  // TOKEN_POOL_MAP). If Dexscreener's discovery feed surfaces the same
  // contract address, the existing row stays the source of truth for it
  // (name, verification, dex label, etc). Checking stock_token only (the
  // original version of this filter) let already-tracked defi/meme tokens
  // like USDG or wBTC get re-inserted as a SECOND, separate `trending` row
  // for the same real-world token — visible as the same symbol showing up
  // twice on /tokens, once correctly labeled and once stuck on whatever
  // stale `dex` value it was created with.
  const knownTokens = await prisma.token.findMany({
    where: { category: { in: ['stock_token', 'defi', 'meme'] } },
    select: { symbol: true, contractAddress: true },
  });
  const knownAddresses = new Set(
    knownTokens
      .map((t) => t.contractAddress?.toLowerCase())
      .filter((a): a is string => Boolean(a)),
  );
  const knownSymbols = new Set(
    knownTokens.map((t) => t.symbol.toLowerCase()),
  );

  const fresh = candidates.filter(
    (c) =>
      !knownAddresses.has(c.contractAddress.toLowerCase()) &&
      !knownSymbols.has(c.symbol.toLowerCase()),
  );
  const freshAddresses = new Set(
    fresh.map((c) => c.contractAddress.toLowerCase()),
  );

  // Previously-tracked trending tokens whose address isn't in *this run's*
  // discovery window. Do NOT delete these on that basis alone —
  // /token-profiles/latest/v1 is a rolling "newest submitted profiles"
  // feed *across all chains*, not a stable "currently trending on Robinhood
  // Chain" ranking. A token can drop out of that window purely because
  // unrelated profiles on other chains got submitted more recently, even
  // though it's still trading here just fine. Deleting on window-absence
  // alone caused legitimate tokens to appear and then vanish on the very
  // next sync run.
  //
  // Instead, re-verify each one directly by its own address (the
  // /token-pairs/v1 endpoint — 300 req/min, not the noisy 60 req/min
  // profiles feed) and only drop it if it no longer has ANY tradeable pair
  // at all. Per product decision, this does NOT gate on a liquidity number —
  // every Robinhood Chain token with a pair stays visible, thin or not.
  const existing = await prisma.token.findMany({
    where: { category: 'trending' },
  });

  const toDelete: string[] = [];
  let verifiedKept = 0;

  // Duplicate cleanup: a `trending` row whose symbol or contract address now
  // matches a stock_token/defi/meme token (see knownSymbols/knownAddresses
  // above) is a leftover from before that check covered every category —
  // drop it outright, don't bother re-verifying it. Its data is stale and
  // the other category's row is the real source of truth for that token.
  const duplicates = existing.filter(
    (t) =>
      knownSymbols.has(t.symbol.toLowerCase()) ||
      (t.contractAddress != null &&
        knownAddresses.has(t.contractAddress.toLowerCase())),
  );
  toDelete.push(...duplicates.map((t) => t.id));
  const duplicateIds = new Set(duplicates.map((t) => t.id));

  const droppedFromWindow = existing.filter(
    (t) =>
      !duplicateIds.has(t.id) &&
      (!t.contractAddress ||
        !freshAddresses.has(t.contractAddress.toLowerCase())),
  );

  for (const token of droppedFromWindow) {
    if (!token.contractAddress) {
      toDelete.push(token.id);
      continue;
    }

    const snap = await fetchDexscreenerPairByTokenAddress(
      token.contractAddress,
    );
    const stillHasPair = !snap.error && snap.priceUsd != null;

    if (stillHasPair) {
      verifiedKept += 1;

      // Backfill/normalize the source label for rows created under the old
      // Blockscout-based discovery. Without this, a token that stays
      // "verified kept" run after run never passes through the `fresh`
      // upsert below and keeps whatever `dex` value it was created with
      // indefinitely — showing a stale "Blockscout" source in the UI even
      // though its price/volume have come from Dexscreener for a long time.
      if (token.dex !== 'Robinhood Chain (Dexscreener)') {
        await prisma.token.update({
          where: { id: token.id },
          data: { dex: 'Robinhood Chain (Dexscreener)' },
        });
      }
    } else {
      toDelete.push(token.id);
    }
  }

  if (toDelete.length > 0) {
    await prisma.token.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (const candidate of fresh) {
    await prisma.token.upsert({
      where: {
        symbol_contractAddress: {
          symbol: candidate.symbol,
          contractAddress: candidate.contractAddress,
        },
      },
      update: { name: candidate.name, dex: 'Robinhood Chain (Dexscreener)' },
      create: {
        symbol: candidate.symbol,
        name: candidate.name,
        contractAddress: candidate.contractAddress,
        dex: 'Robinhood Chain (Dexscreener)',
        category: 'trending',
        coingeckoId: null,
        isTracked: true,
      },
    });
  }

  return {
    discovered: candidates.length,
    upserted: fresh.length,
    removed: toDelete.length,
    verifiedKept,
    tracked: fresh.map((c) => c.symbol),
  };
}
