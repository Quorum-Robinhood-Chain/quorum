// DefiLlama API — no key required. Docs: https://defillama.com/docs/api
// Used for: chain-level TVL, DEX volume ranking among L2s, protocol-level TVL (§7.2).

const CHAIN_SLUG = process.env.DEFILLAMA_CHAIN_SLUG || "robinhood-chain";

export interface ChainTvlResult {
  tvlUsd: number | null;
}

/** GET /v2/chains — list of all chains with current TVL; we find ours by slug/name. */
export async function fetchChainTvl(): Promise<ChainTvlResult> {
  const res = await fetch("https://api.llama.fi/v2/chains", { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`DefiLlama /v2/chains failed: ${res.status}`);
  const chains: Array<{ name: string; gecko_id: string | null; tvl: number }> = await res.json();

  const match = chains.find(
    (c) => c.name.toLowerCase().replace(/\s+/g, "-") === CHAIN_SLUG.toLowerCase(),
  );
  return { tvlUsd: match?.tvl ?? null };
}

export interface DexVolumeResult {
  total24hUsd: number | null;
  chainRankAmongTracked: number | null;
}

/**
 * GET /overview/dexs/{chain} — 24h DEX volume for a given chain, plus we compute the
 * chain's rank by comparing against /overview/dexs (all chains) totals.
 */
export async function fetchChainDexVolume(): Promise<DexVolumeResult> {
  const res = await fetch(
    `https://api.llama.fi/overview/dexs/${CHAIN_SLUG}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) throw new Error(`DefiLlama dexs overview failed: ${res.status}`);
  const data: { total24h: number | null } = await res.json();

  let rank: number | null = null;
  try {
    const allRes = await fetch(
      "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true",
      { next: { revalidate: 0 } },
    );
    if (allRes.ok) {
      const all: { protocols: Array<{ chains: string[]; total24h: number | null }> } = await allRes.json();
      // Rank chains by summed 24h volume across their protocols.
      const byChain = new Map<string, number>();
      for (const p of all.protocols ?? []) {
        for (const chain of p.chains ?? []) {
          byChain.set(chain, (byChain.get(chain) ?? 0) + (p.total24h ?? 0));
        }
      }
      const sorted = [...byChain.entries()].sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([name]) => name.toLowerCase() === CHAIN_SLUG.replace(/-/g, " "));
      rank = idx >= 0 ? idx + 1 : null;
    }
  } catch {
    // Ranking is a nice-to-have; volume total above is the important number.
  }

  return { total24hUsd: data.total24h ?? null, chainRankAmongTracked: rank };
}

/** GET /protocol/{slug} — TVL for a single protocol (e.g. Morpho, used as a cross-check vs the Morpho API). */
export async function fetchProtocolTvl(protocolSlug: string): Promise<number | null> {
  const res = await fetch(`https://api.llama.fi/protocol/${protocolSlug}`, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data: { chainTvls?: Record<string, number>; currentChainTvls?: Record<string, number> } =
    await res.json();
  // currentChainTvls is keyed by chain display name.
  const tvls = data.currentChainTvls ?? {};
  const key = Object.keys(tvls).find((k) => k.toLowerCase().includes("robinhood"));
  return key ? tvls[key] : null;
}
