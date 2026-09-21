import { prisma } from '@/lib/db';
import { fetchActiveStockTokenAssets, fetchStockTokenQuotes } from './robinhood-assets';

export interface StockTokenSyncResult {
  totalActive: number;
  upserted: number;
  removed: number;
  trackedTop10: string[];
  quoteErrors: string[];
}

export async function syncStockTokens(): Promise<StockTokenSyncResult> {
  const assets = await fetchActiveStockTokenAssets();

  if (assets.length === 0) {
    throw new Error('Robinhood /rhj/assets returned no active Stock Tokens');
  }

  const liveSymbols = new Set(assets.map((a) => a.symbol));

  const existing = await prisma.token.findMany({
    where: { category: 'stock_token' },
  });

  const stale = existing.filter((t) => !liveSymbols.has(t.symbol));

  if (stale.length > 0) {
    await prisma.token.deleteMany({
      where: { id: { in: stale.map((t) => t.id) } },
    });
  }

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
