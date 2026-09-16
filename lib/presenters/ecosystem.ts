import { prisma } from '@/lib/db';
import { formatUsd } from '@/lib/format';
import { protocols as fallbackProtocols } from '@/data/ecosystem';
import type { ProtocolRow } from '@/types';

const PROTOCOL_META: Array<Omit<ProtocolRow, 'tvl'> & { scope: string }> = [
  {
    id: 'arcus',
    name: 'Arcus',
    category: 'dex',
    description:
      'DEX from the dYdX team, running fee-rebate incentives to compete for early Robinhood Chain volume.',
    scope: 'protocol:arcus',
    url: '#',
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    category: 'dex',
    description: 'The leading AMM, live on Robinhood Chain since launch.',
    scope: 'protocol:uniswap',
    url: '#',
  },
  {
    id: '1inch',
    name: '1inch',
    category: 'dex',
    description:
      'Aggregator routing swaps across Robinhood Chain DEX liquidity for best execution.',
    scope: 'protocol:1inch',
    url: '#',
  },
  {
    id: 'lighter',
    name: 'Lighter',
    category: 'dex',
    description:
      'Orderbook-style exchange, one of the first venues live on the chain.',
    scope: 'protocol:lighter',
    url: '#',
  },
  {
    id: 'morpho',
    name: 'Morpho',
    category: 'lending',
    description:
      'USDG lending market — the go-to venue for stablecoin yield on Robinhood Chain.',
    scope: 'protocol:morpho',
    url: '#',
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    category: 'oracle',
    description:
      'Price feeds powering Stock Token pricing and other on-chain reference data.',
    scope: 'protocol:chainlink',
    url: '#',
  },
];

export interface EcosystemPresentation {
  protocols: ProtocolRow[];
  usingLiveData: boolean;
}

// Fetch the latest TVL snapshots for tracked ecosystem protocols.
export async function getEcosystemPresentation(): Promise<EcosystemPresentation> {
  try {
    const snapshots = await prisma.marketSnapshot.findMany({
      where: {
        scope: { in: PROTOCOL_META.map((p) => p.scope) },
        metric: 'tvl',
      },
      orderBy: { timestamp: 'desc' },
    });

    // Keep only the most recent snapshot for each protocol.
    const latestByScope = new Map<string, number>();

    for (const s of snapshots) {
      if (!latestByScope.has(s.scope)) {
        latestByScope.set(s.scope, s.value);
      }
    }

    if (latestByScope.size === 0) {
      return {
        protocols: fallbackProtocols,
        usingLiveData: false,
      };
    }

    const protocols: ProtocolRow[] = PROTOCOL_META.map((p) => {
      const tvl = latestByScope.get(p.scope);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        url: p.url,
        tvl: tvl != null ? formatUsd(tvl) : '—',
      };
    });

    return { protocols, usingLiveData: true };
  } catch {
    return {
      protocols: fallbackProtocols,
      usingLiveData: false,
    };
  }
}
