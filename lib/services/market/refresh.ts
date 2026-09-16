import { prisma } from '@/lib/db/client';
import {
  fetchChainTvl,
  fetchChainDexVolume,
  fetchProtocolTvl,
} from './defillama';
import { fetchMorphoUsdgMarket } from './morpho';
import { fetchAllDexVolumes } from './dexSubgraph';
import { fetchOnchainTokenSnapshots } from './onchainPools';
import { fetchLatestBlockNumber } from './chainRpc';
import { fetchStockTokenPrices } from './chainlink';

// Protocol-level TVL for the DEXs (Arcus, Uniswap, 1inch, Lighter) — same "protocol:<id>" scope
// convention lib/presenters/ecosystem.ts reads (kept in sync with PROTOCOL_META there). DefiLlama
// slugs here are best guesses, same unverified caveat as DEFILLAMA_CHAIN_SLUG in .env.example —
// confirm the real slug once each deployment is listed. fetchProtocolTvl returns null on a bad
// slug rather than throwing, so a wrong guess just yields "—" on the Ecosystem page, not an error.
const DEX_PROTOCOL_TVL_SLUGS: Record<string, string> = {
  arcus: 'arcus',
  uniswap: 'uniswap-v3',
  '1inch': '1inch-network',
  lighter: 'lighter',
};

/**
 * The "market-data refresh" job (§8.2, runs every 1–5 min, independent of the LLM pipeline).
 * Pulls current values from every configured provider and appends them as MarketSnapshot rows.
 * Ticker/sidebar API routes read the *latest* snapshot per metric — see app/api/ticker/route.ts.
 *
 * Each fetch is wrapped so one provider being down/misconfigured doesn't block the others
 * (§12 NFR: "degrade gracefully ... never show stale data as live" — the ticker route is
 * responsible for surfacing "last updated" based on snapshot timestamps, not this job).
 */
export async function refreshMarketData(): Promise<{
  written: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const snapshots: Array<{
    scope: string;
    metric: import('@prisma/client').Metric;
    value: number;
    unit?: string;
    source: string;
  }> = [];

  await safely(errors, 'defillama:chain-tvl', async () => {
    const { tvlUsd } = await fetchChainTvl();
    if (tvlUsd != null)
      snapshots.push({
        scope: 'chain',
        metric: 'tvl',
        value: tvlUsd,
        unit: 'usd',
        source: 'DefiLlama',
      });
  });

  await safely(errors, 'defillama:dex-volume', async () => {
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

  await safely(errors, 'defillama:morpho-tvl-crosscheck', async () => {
    const tvl = await fetchProtocolTvl('morpho');
    if (tvl != null)
      snapshots.push({
        scope: 'protocol:morpho',
        metric: 'tvl',
        value: tvl,
        unit: 'usd',
        source: 'DefiLlama',
      });
  });

  for (const [id, slug] of Object.entries(DEX_PROTOCOL_TVL_SLUGS)) {
    await safely(errors, `defillama:protocol-tvl:${id}`, async () => {
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
          `defillama:protocol:${id}: no TVL found for slug "${slug}" — unverified slug, confirm on DefiLlama once the Robinhood Chain deployment is listed`,
        );
      }
    });
  }

  await safely(errors, 'morpho:usdg-market', async () => {
    const m = await fetchMorphoUsdgMarket();
    if (m.error) {
      errors.push(`morpho: ${m.error}`);
      return;
    }
    if (m.supplyApy != null) {
      snapshots.push({
        scope: 'protocol:morpho:usdg',
        metric: 'apy',
        value: m.supplyApy * 100,
        unit: 'pct',
        source: 'Morpho API',
      });
    }
    if (m.supplyTvlUsd != null) {
      snapshots.push({
        scope: 'protocol:morpho:usdg',
        metric: 'tvl',
        value: m.supplyTvlUsd,
        unit: 'usd',
        source: 'Morpho API',
      });
    }

    // USDG is a $1-pegged lending token — the Tokens page reads the "token:<symbol>" scope
    // (see lib/presenters/tokens.ts), which nothing else writes for USDG (it's not a
    // Chainlink stock-token and it isn't returned by any of the DEX subgraph adapters).
    // Only emit the peg price once we've confirmed the market actually resolved above,
    // so a misconfigured/missing market still shows "—" instead of a fake price.
    if (m.supplyTvlUsd != null || m.supplyApy != null) {
      snapshots.push({
        scope: 'token:USDG',
        metric: 'price',
        value: 1,
        unit: 'usd',
        source: 'Morpho API (peg assumption)',
      });
    }
  });

  // Robinhood-only path: read DEX-listed tokens straight off Robinhood Chain via RPC
  // (TOKEN_POOL_MAP + RHC_RPC_URL) instead of guessing third-party subgraph endpoints that
  // likely don't index a brand-new chain yet. See onchainPools.ts for config format.
  await safely(errors, 'onchain:token-pools', async () => {
    const dexTokens = await prisma.token.findMany({
      where: { category: { in: ['defi', 'meme'] }, isTracked: true },
    });
    if (dexTokens.length === 0) return;

    const results = await fetchOnchainTokenSnapshots(dexTokens.map((t) => t.symbol));
    for (const r of results) {
      if (r.error) {
        errors.push(`onchain:${r.symbol}: ${r.error}`);
        continue;
      }
      if (r.priceUsd != null) {
        snapshots.push({
          scope: `token:${r.symbol}`,
          metric: 'price',
          value: r.priceUsd,
          unit: 'usd',
          source: 'Robinhood Chain RPC',
        });
      }
      if (r.volume24hUsd != null) {
        snapshots.push({
          scope: `token:${r.symbol}`,
          metric: 'volume_24h',
          value: r.volume24hUsd,
          unit: 'usd',
          source: 'Robinhood Chain RPC',
        });
      }
    }
  });

  // Legacy third-party subgraph path — kept disabled by default (see fetchAllDexVolumes /
  // dexSubgraph.ts). Only useful once Uniswap/Arcus/1inch/Lighter actually confirm & index
  // a Robinhood Chain deployment; until then it will just add noisy "not configured" errors.
  if (process.env.ENABLE_DEX_SUBGRAPHS === 'true') {
    await safely(errors, 'dex-subgraphs:token-volume', async () => {
      const results = await fetchAllDexVolumes();
      for (const dexResult of results) {
        if (!dexResult.configured) {
          errors.push(`${dexResult.dex}: not configured (see dexSubgraph.ts)`);
          continue;
        }
        if (dexResult.error) {
          errors.push(`${dexResult.dex}: ${dexResult.error}`);
          continue;
        }
        for (const t of dexResult.tokens) {
          if (t.volume24hUsd != null) {
            snapshots.push({
              scope: `token:${t.symbol}`,
              metric: 'volume_24h',
              value: t.volume24hUsd,
              unit: 'usd',
              source: dexResult.dex,
            });
          }
          if (t.priceUsd != null) {
            snapshots.push({
              scope: `token:${t.symbol}`,
              metric: 'price',
              value: t.priceUsd,
              unit: 'usd',
              source: dexResult.dex,
            });
          }
        }
      }
    });
  }

  await safely(errors, 'chainlink:stock-token-prices', async () => {
    const stockTokens = await prisma.token.findMany({
      where: { category: 'stock_token', isTracked: true },
    });
    if (stockTokens.length === 0) return;

    const prices = await fetchStockTokenPrices(
      stockTokens.map((t) => t.symbol),
    );
    for (const p of prices) {
      if (p.error) {
        errors.push(`chainlink:${p.symbol}: ${p.error}`);
        continue;
      }
      if (p.priceUsd != null) {
        // Same "token:<symbol>" scope as the DEX-sourced tokens below — the Tokens page and the
        // trending_dex_tokens/stock_token_movers templates read this scope regardless of category.
        snapshots.push({
          scope: `token:${p.symbol}`,
          metric: 'price',
          value: p.priceUsd,
          unit: 'usd',
          source: 'Chainlink',
        });
      }
    }
  });

  await safely(errors, 'chain-rpc:block-number', async () => {
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

  if (snapshots.length > 0) {
    await prisma.marketSnapshot.createMany({ data: snapshots });
  }

  return { written: snapshots.length, errors };
}

async function safely(
  errors: string[],
  label: string,
  fn: () => Promise<void>,
) {
  try {
    await fn();
  } catch (err) {
    errors.push(`${label}: ${(err as Error).message}`);
  }
}
