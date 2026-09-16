import type { Metric } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  fetchChainTvl,
  fetchChainDexVolume,
  fetchProtocolTvl,
} from './defillama';
import { fetchMorphoUsdgMarket } from './morpho';
import { fetchOnchainTokenSnapshots } from './pools';
import { fetchLatestBlockNumber } from './chain-rpc';
import { fetchStockTokenPrices } from './stock-tokens';
import { fetchTokenPrices } from './coingecko';

const DEX_PROTOCOL_SLUGS: Record<string, string> = {
  arcus: 'arcus',
  uniswap: 'uniswap-v3',
  '1inch': '1inch-network',
  lighter: 'lighter',
};

interface SnapshotInput {
  scope: string;
  metric: Metric;
  value: number;
  unit?: string;
  source: string;
}

export interface RefreshResult {
  written: number;
  errors: string[];
}

// Refresh market data from external sources and store valid snapshots.
export async function refreshMarketData(): Promise<RefreshResult> {
  const snapshots: SnapshotInput[] = [];
  const errors: string[] = [];

  // Run a data source safely without stopping the full refresh process.
  const safely = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message}`);
    }
  };

  await safely('defillama:chain-tvl', async () => {
    const { tvlUsd } = await fetchChainTvl();

    if (tvlUsd != null) {
      snapshots.push({
        scope: 'chain',
        metric: 'tvl',
        value: tvlUsd,
        unit: 'usd',
        source: 'DefiLlama',
      });
    }
  });

  await safely('defillama:dex-volume', async () => {
    const { total24hUsd, chainRankAmongTracked } = await fetchChainDexVolume();

    if (total24hUsd != null) {
      snapshots.push({
        scope: 'chain',
        metric: 'volume_24h',
        value: total24hUsd,
        unit: 'usd',
        source: 'DefiLlama',
      });
    }

    if (chainRankAmongTracked != null) {
      snapshots.push({
        scope: 'chain',
        metric: 'dex_volume_rank',
        value: chainRankAmongTracked,
        unit: 'rank',
        source: 'DefiLlama',
      });
    }
  });

  // Refresh TVL for each tracked ecosystem protocol.
  for (const [id, slug] of Object.entries({
    morpho: 'morpho',
    ...DEX_PROTOCOL_SLUGS,
  })) {
    await safely(`defillama:protocol-tvl:${id}`, async () => {
      const tvl = await fetchProtocolTvl(slug);

      if (tvl != null) {
        snapshots.push({
          scope: `protocol:${id}`,
          metric: 'tvl',
          value: tvl,
          unit: 'usd',
          source: 'DefiLlama',
        });
      } else {
        errors.push(
          `defillama:protocol:${id}: no TVL for slug "${slug}" — confirm the slug once listed`,
        );
      }
    });
  }

  await safely('morpho:usdg-market', async () => {
    const market = await fetchMorphoUsdgMarket();

    if (market.error) {
      errors.push(`morpho: ${market.error}`);
      return;
    }

    if (market.supplyApy != null) {
      snapshots.push({
        scope: 'protocol:morpho:usdg',
        metric: 'apy',
        value: market.supplyApy * 100,
        unit: 'pct',
        source: 'Morpho API',
      });
    }

    if (market.supplyTvlUsd != null) {
      snapshots.push({
        scope: 'protocol:morpho:usdg',
        metric: 'tvl',
        value: market.supplyTvlUsd,
        unit: 'usd',
        source: 'Morpho API',
      });
    }
  });

  await safely('coingecko:token-prices', async () => {
    const tokens = await prisma.token.findMany({
      where: { isTracked: true, NOT: { coingeckoId: null } },
    });

    if (tokens.length === 0) return;

    const prices = await fetchTokenPrices(
      tokens.map((t) => t.coingeckoId as string),
    );
    const byId = new Map(prices.map((p) => [p.id, p]));

    for (const token of tokens) {
      const price = byId.get(token.coingeckoId as string);
      if (!price) continue;

      if (price.usd != null) {
        snapshots.push({
          scope: `token:${token.symbol}`,
          metric: 'price',
          value: price.usd,
          unit: 'usd',
          source: 'CoinGecko',
        });
      }

      if (price.usd24hChange != null) {
        snapshots.push({
          scope: `token:${token.symbol}`,
          metric: 'price_change_24h',
          value: price.usd24hChange,
          unit: 'pct',
          source: 'CoinGecko',
        });
      }
    }
  });

  await safely('onchain:token-pools', async () => {
    const tokens = await prisma.token.findMany({
      where: { category: { in: ['defi', 'meme'] }, isTracked: true },
    });

    if (tokens.length === 0) return;

    const results = await fetchOnchainTokenSnapshots(
      tokens.map((t) => t.symbol),
    );

    for (const result of results) {
      if (result.error) {
        errors.push(`onchain:${result.symbol}: ${result.error}`);
        continue;
      }

      if (result.priceUsd != null) {
        snapshots.push({
          scope: `token:${result.symbol}`,
          metric: 'price',
          value: result.priceUsd,
          unit: 'usd',
          source: 'Robinhood Chain RPC',
        });
      }

      if (result.volume24hUsd != null) {
        snapshots.push({
          scope: `token:${result.symbol}`,
          metric: 'volume_24h',
          value: result.volume24hUsd,
          unit: 'usd',
          source: 'Robinhood Chain RPC',
        });
      }
    }
  });

  await safely('stock-tokens:prices', async () => {
    const tokens = await prisma.token.findMany({
      where: { category: 'stock_token', isTracked: true },
    });

    if (tokens.length === 0) return;

    const prices = await fetchStockTokenPrices(tokens.map((t) => t.symbol));

    for (const price of prices) {
      if (price.error) {
        errors.push(`stock-token:${price.symbol}: ${price.error}`);
        continue;
      }

      if (price.warning) {
        errors.push(
          `stock-token:${price.symbol} (non-fatal): ${price.warning}`,
        );
      }

      if (price.priceUsd != null) {
        snapshots.push({
          scope: `token:${price.symbol}`,
          metric: 'price',
          value: price.priceUsd,
          unit: 'usd',
          source: 'Finnhub / on-chain contract',
        });
      }

      if (price.changePct24h != null) {
        snapshots.push({
          scope: `token:${price.symbol}`,
          metric: 'price_change_24h',
          value: price.changePct24h,
          unit: 'pct',
          source: 'Finnhub',
        });
      }
    }
  });

  await safely('chain-rpc:block-number', async () => {
    const block = await fetchLatestBlockNumber();

    if (block != null) {
      snapshots.push({
        scope: 'chain',
        metric: 'tx_count',
        value: block,
        unit: 'block_number',
        source: 'Chain RPC',
      });
    }
  });

  // Persist all collected snapshots in a single database operation.
  if (snapshots.length > 0) {
    await prisma.marketSnapshot.createMany({ data: snapshots });
  }

  return { written: snapshots.length, errors };
}
