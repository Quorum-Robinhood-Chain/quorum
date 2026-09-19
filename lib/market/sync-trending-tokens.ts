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

export async function syncTrendingTokens(): Promise<TrendingTokenSyncResult> {
  const candidates = await fetchTrendingTokenCandidates();

  if (candidates.length === 0) {

    return {
      discovered: 0,
      upserted: 0,
      removed: 0,
      verifiedKept: 0,
      tracked: [],
      skipped: 'no Robinhood Chain candidates from Dexscreener this run',
    };
  }

  // Never duplicate a token
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


  const existing = await prisma.token.findMany({
    where: { category: 'trending' },
  });

  const toDelete: string[] = [];
  let verifiedKept = 0;

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
