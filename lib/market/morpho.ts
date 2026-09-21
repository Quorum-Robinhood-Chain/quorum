import { env } from '@/lib/env';

const MORPHO_GRAPHQL_URL = 'https://blue-api.morpho.org/graphql';

const QUERY = `
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

// Fetch the current Morpho USDG market state.
export async function fetchMorphoUsdgMarket(): Promise<MorphoUsdgSnapshot> {
  const marketId = env('MORPHO_USDG_MARKET_ID');

  if (!marketId) return empty('MORPHO_USDG_MARKET_ID not set');

  const res = await fetch(MORPHO_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { id: marketId },
    }),
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
