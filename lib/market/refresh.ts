import type { Metric } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fetchChainTvl, fetchChainDexVolume, fetchProtocolTvl } from './defillama';
import { fetchMorphoUsdgMarket } from './morpho';
import { fetchOnchainTokenSnapshots } from './pools';
import { fetchLatestBlockNumber } from './chain-rpc';
import { fetchStockTokenPrices } from './stock-tokens';
import { fetchTokenPrices } from './coingecko';

/**
 * The market-data refresh job (§8.2) — runs every few minutes, independent of the LLM
 * pipeline. Appends a MarketSnapshot row per metric; presenters read the latest row per
 * (scope, metric) and decide when to flag data as delayed (§12).
 *
 * Every provider is wrapped so one being down or unconfigured never blocks the rest.
 */

// Scope convention: "chain" | "token:<SYMBOL>" | "protocol:<id>" | "protocol:morpho:usdg".
// Kept in sync with lib/presenters/ecosystem.ts. DefiLlama slugs are best guesses until
// each Robinhood Chain deployment is listed — a wrong slug yields "—", not an error.
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

export async function refreshMarketData(): Promise<RefreshResult> {
  const snapshots: SnapshotInput[] = [];
  const errors: string[] = [];

  const safely = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message}`);
    }
  };

  // ── Chain-level (DefiLlama) ───────────────────────────────────────────────
  await safely('defillama:chain-tvl', async () => {
    const { tvlUsd } = await fetchChainTvl();
    if (tvlUsd != null) {
      snapshots.push({ scope: 'chain', metric: 'tvl', value: tvlUsd, unit: 'usd', source: 'DefiLlama' });
    }
  });

  await safely('defillama:dex-volume', async () => {
    const { total24hUsd, chainRankAmongTracked } = await fetchChainDexVolume();
    if (total24hUsd != null) {
      snapshots.push({ scope: 'chain', metric: 'volume_24h', value: total24hUsd, unit: 'usd', source: 'DefiLlama' });
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

  // ── Protocol TVL (DefiLlama) ──────────────────────────────────────────────
  for (const [id, slug] of Object.entries({ morpho: 'morpho', ...DEX_PROTOCOL_SLUGS })) {
    await safely(`defillama:protocol-tvl:${id}`, async () => {
      const tvl = await fetchProtocolTvl(slug);
      if (tvl != null) {
        snapshots.push({ scope: `protocol:${id}`, metric: 'tvl', value: tvl, unit: 'usd', source: 'DefiLlama' });
      } else {
        errors.push(`defillama:protocol:${id}: no TVL for slug "${slug}" — confirm the slug once listed`);
      }
    });
  }

  // ── USDG lending (Morpho) ─────────────────────────────────────────────────
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

  // ── Listed tokens (CoinGecko) ─────────────────────────────────────────────
  // The only source that supplies price_change_24h, and the only one that works with no
  // on-chain config — so the Tokens page has real numbers before pools are mapped.
  await safely('coingecko:token-prices', async () => {
    const tokens = await prisma.token.findMany({ where: { isTracked: true, NOT: { coingeckoId: null } } });
    if (tokens.length === 0) return;

    const prices = await fetchTokenPrices(tokens.map((t) => t.coingeckoId as string));
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

  // ── DEX-listed tokens, read straight off the chain ────────────────────────
  // Overwrites the CoinGecko price for anything with a mapped pool, since an on-chain
  // read reflects Robinhood Chain liquidity rather than a global average.
  await safely('onchain:token-pools', async () => {
    const tokens = await prisma.token.findMany({ where: { category: { in: ['defi', 'meme'] }, isTracked: true } });
    if (tokens.length === 0) return;

    for (const result of await fetchOnchainTokenSnapshots(tokens.map((t) => t.symbol))) {
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

  // ── Stock Tokens ──────────────────────────────────────────────────────────
  await safely('stock-tokens:prices', async () => {
    const tokens = await prisma.token.findMany({ where: { category: 'stock_token', isTracked: true } });
    if (tokens.length === 0) return;

    for (const price of await fetchStockTokenPrices(tokens.map((t) => t.symbol))) {
      if (price.error) {
        errors.push(`stock-token:${price.symbol}: ${price.error}`);
        continue;
      }
      if (price.priceUsd != null) {
        snapshots.push({
          scope: `token:${price.symbol}`,
          metric: 'price',
          value: price.priceUsd,
          unit: 'usd',
          source: 'Stooq / on-chain contract',
        });
      }
    }
  });

  // ── Chain activity ────────────────────────────────────────────────────────
  await safely('chain-rpc:block-number', async () => {
    const block = await fetchLatestBlockNumber();
    if (block != null) {
      snapshots.push({ scope: 'chain', metric: 'tx_count', value: block, unit: 'block_number', source: 'Chain RPC' });
    }
  });

  if (snapshots.length > 0) await prisma.marketSnapshot.createMany({ data: snapshots });

  return { written: snapshots.length, errors };
}
