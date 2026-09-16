import { env } from '@/lib/env';

const chainSlug = () =>
  env('DEFILLAMA_CHAIN_SLUG', 'robinhood-chain').toLowerCase();

// Fetch the current TVL for the configured chain.
export async function fetchChainTvl(): Promise<{ tvlUsd: number | null }> {
  const res = await fetch('https://api.llama.fi/v2/chains', {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`DefiLlama /v2/chains failed: ${res.status}`);
  }

  const chains: Array<{ name: string; tvl: number }> = await res.json();
  const match = chains.find(
    (c) => c.name.toLowerCase().replace(/\s+/g, '-') === chainSlug(),
  );

  return { tvlUsd: match?.tvl ?? null };
}

export interface DexVolumeResult {
  total24hUsd: number | null;
  chainRankAmongTracked: number | null;
}

// Fetch 24-hour DEX volume and the chain's tracked volume rank.
export async function fetchChainDexVolume(): Promise<DexVolumeResult> {
  const params =
    'excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true';

  const res = await fetch(
    `https://api.llama.fi/overview/dexs/${chainSlug()}?${params}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(`DefiLlama dexs overview failed: ${res.status}`);
  }

  const data: { total24h: number | null } = await res.json();

  let rank: number | null = null;

  try {
    const allRes = await fetch(`https://api.llama.fi/overview/dexs?${params}`, {
      cache: 'no-store',
    });

    if (allRes.ok) {
      const all: {
        protocols?: Array<{
          chains?: string[];
          total24h: number | null;
        }>;
      } = await allRes.json();

      const byChain = new Map<string, number>();

      for (const protocol of all.protocols ?? []) {
        for (const chain of protocol.chains ?? []) {
          byChain.set(
            chain,
            (byChain.get(chain) ?? 0) + (protocol.total24h ?? 0),
          );
        }
      }

      const sorted = [...byChain.entries()].sort((a, b) => b[1] - a[1]);
      const index = sorted.findIndex(
        ([name]) => name.toLowerCase() === chainSlug().replace(/-/g, ' '),
      );

      rank = index >= 0 ? index + 1 : null;
    }
  } catch {
    // Rank is optional; preserve the volume result if ranking fails.
  }

  return {
    total24hUsd: data.total24h ?? null,
    chainRankAmongTracked: rank,
  };
}

// Fetch the current TVL for a protocol on Robinhood Chain.
export async function fetchProtocolTvl(
  protocolSlug: string,
): Promise<number | null> {
  const res = await fetch(`https://api.llama.fi/protocol/${protocolSlug}`, {
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data: { currentChainTvls?: Record<string, number> } = await res.json();

  const tvls = data.currentChainTvls ?? {};
  const key = Object.keys(tvls).find((k) =>
    k.toLowerCase().includes('robinhood'),
  );

  return key ? tvls[key] : null;
}
