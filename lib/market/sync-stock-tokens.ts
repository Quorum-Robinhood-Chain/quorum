import { prisma } from '@/lib/db';
import { fetchActiveStockTokenAssets, fetchStockTokenQuotes } from './robinhood-assets';

export interface StockTokenSyncResult {
  totalActive: number;
  upserted: number;
  removed: number;
  trackedTop10: string[];
  quoteErrors: string[];
}

// Sync the Token table's stock_token rows against Robinhood's live catalog, then
// rank all of them by 24h dollar volume and mark only the top 10 as `isTracked`.
// Run this on its own schedule (daily is plenty — see .github/workflows/cron.yml)
// rather than on every 5-minute market refresh: the catalog and the top-10
// ranking both change slowly, and a full sync makes 190+ HTTP calls out to
// Robinhood which is unnecessary to repeat every 5 minutes. The 5-minute
// `market` job (lib/market/refresh.ts) only prices whichever 10 are already
// marked isTracked, which stays cheap.
export async function syncStockTokens(): Promise<StockTokenSyncResult> {
  const assets = await fetchActiveStockTokenAssets();

  if (assets.length === 0) {
    throw new Error('Robinhood /rhj/assets returned no active Stock Tokens');
  }

  const liveSymbols = new Set(assets.map((a) => a.symbol));

  // Drop any previously-synced (or legacy hardcoded) stock_token rows that are no
  // longer in the live active catalog — e.g. delisted tokens, or the old
  // "x"-suffixed sample rows (AAPLx, NVDAx, ...) from before this sync existed.
  const existing = await prisma.token.findMany({
    where: { category: 'stock_token' },
  });

  const stale = existing.filter((t) => !liveSymbols.has(t.symbol));

  if (stale.length > 0) {
    await prisma.token.deleteMany({
      where: { id: { in: stale.map((t) => t.id) } },
    });
  }

  // Upsert every active asset. isTracked starts false and only gets flipped on
  // for the top 10 by volume below — this keeps the 5-minute price refresh cheap.
  for (const asset of assets) {
    await prisma.token.upsert({
      where: {
        symbol_contractAddress: {
          symbol: asset.symbol,
          contractAddress: asset.contractAddress,
        },
      },
      update: { name: asset.name, dex: 'Stock Token' },
      create: {
        symbol: asset.symbol,
        name: asset.name,
        contractAddress: asset.contractAddress,
        dex: 'Stock Token',
        category: 'stock_token',
        coingeckoId: null,
        isTracked: false,
      },
    });
  }

  // Rank the full active catalog by 24h dollar volume to find the top 10.
  const quotes = await fetchStockTokenQuotes(assets.map((a) => a.symbol));
  const quoteErrors = quotes
    .filter((q) => q.error)
    .map((q) => `${q.symbol}: ${q.error}`);

  const ranked = quotes
    .filter((q) => q.dailyTradingVolumeUsd != null)
    .sort((a, b) => (b.dailyTradingVolumeUsd ?? 0) - (a.dailyTradingVolumeUsd ?? 0));

  const top10 = new Set(ranked.slice(0, 10).map((q) => q.symbol));

  await prisma.token.updateMany({
    where: { category: 'stock_token', symbol: { in: Array.from(top10) } },
    data: { isTracked: true },
  });

  await prisma.token.updateMany({
    where: { category: 'stock_token', symbol: { notIn: Array.from(top10) } },
    data: { isTracked: false },
  });

  return {
    totalActive: assets.length,
    upserted: assets.length,
    removed: stale.length,
    trackedTop10: Array.from(top10),
    quoteErrors,
  };
}
