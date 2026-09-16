// Morpho's public GraphQL API (blue-api.morpho.org) — no key required.
// Used for USDG lending pool TVL/APY on Robinhood Chain (§7.2, §6.2 "TVL & lending snapshot").
// Set MORPHO_USDG_MARKET_ID once the Robinhood Chain USDG market's id is confirmed
// (Morpho market ids are per-chain, so this can't be hardcoded from other chains).

const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";

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

export async function fetchMorphoUsdgMarket(): Promise<MorphoUsdgSnapshot> {
  const marketId = process.env.MORPHO_USDG_MARKET_ID;
  if (!marketId) {
    return {
      supplyApy: null,
      supplyTvlUsd: null,
      borrowApy: null,
      utilization: null,
      error: "MORPHO_USDG_MARKET_ID not set",
    };
  }

  const res = await fetch(MORPHO_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { id: marketId } }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return { supplyApy: null, supplyTvlUsd: null, borrowApy: null, utilization: null, error: `HTTP ${res.status}` };
  }

  const json = await res.json();
  const state = json?.data?.marketByUniqueKey?.state;
  if (!state) {
    return { supplyApy: null, supplyTvlUsd: null, borrowApy: null, utilization: null, error: "market not found" };
  }

  return {
    supplyApy: state.supplyApy ?? null,
    supplyTvlUsd: state.supplyAssetsUsd ?? null,
    borrowApy: state.borrowApy ?? null,
    utilization: state.utilization ?? null,
  };
}
