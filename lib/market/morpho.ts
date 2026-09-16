import { env } from '@/lib/env';

// Morpho public GraphQL API — no key required. USDG lending TVL/APY (§7.2, §6.2).
// Market ids are per-chain, so MORPHO_USDG_MARKET_ID must be set for Robinhood Chain.

const MORPHO_GRAPHQL_URL = 'https://blue-api.morpho.org/graphql';

const QUERY = /* GraphQL */ `
  query MarketState($id: String!) {
    marketByUniqueKey(uniqueKey: $id) {
      state {
        supplyApy
        supplyAssetsUsd
        borrowApy
        utilization
      }
    }
  }
`;

export interface MorphoUsdgSnapshot {
  supplyApy: number | null;
  supplyTvlUsd: number | null;
  borrowApy: number | null;
  utilization: number | null;
  error?: string;
}

const empty = (error: string): MorphoUsdgSnapshot => ({
  supplyApy: null,
  supplyTvlUsd: null,
  borrowApy: null,
  utilization: null,
  error,
});

export async function fetchMorphoUsdgMarket(): Promise<MorphoUsdgSnapshot> {
  const marketId = env('MORPHO_USDG_MARKET_ID');
  if (!marketId) return empty('MORPHO_USDG_MARKET_ID not set');

  const res = await fetch(MORPHO_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { id: marketId } }),
    cache: 'no-store',
  });
  if (!res.ok) return empty(`HTTP ${res.status}`);

  const state = (await res.json())?.data?.marketByUniqueKey?.state;
  if (!state) return empty('market not found');

  return {
    supplyApy: state.supplyApy ?? null,
    supplyTvlUsd: state.supplyAssetsUsd ?? null,
    borrowApy: state.borrowApy ?? null,
    utilization: state.utilization ?? null,
  };
}
