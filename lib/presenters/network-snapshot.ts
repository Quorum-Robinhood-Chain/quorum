import { prisma } from '@/lib/db';
import { formatUsd, formatPct, timeAgo } from '@/lib/format';
import { networkSnapshot as fallbackNetworkSnapshot } from '@/data/stats';
import type { NetworkStat } from '@/types';

const LIVE_METRICS: Array<{
  scope: string;
  metric: string;
  label: string;
  kind: 'usd' | 'pct' | 'rank';
}> = [
  {
    scope: 'chain',
    metric: 'tvl',
    label: 'Total Value Locked',
    kind: 'usd',
  },
  {
    scope: 'chain',
    metric: 'volume_24h',
    label: '24h DEX Volume',
    kind: 'usd',
  },
  {
    scope: 'chain',
    metric: 'dex_volume_rank',
    label: 'DEX Volume Rank',
    kind: 'rank',
  },
  {
    scope: 'protocol:morpho:usdg',
    metric: 'apy',
    label: 'USDG Lending APY',
    kind: 'pct',
  },
];

const STALE_AFTER_MS = 10 * 60 * 1000;

export interface NetworkSnapshotPresentation {
  items: NetworkStat[];
  updatedLabel: string;
  usingAnyLiveData: boolean;
}

// Fetch the latest network metrics and determine their data freshness.
export async function getNetworkSnapshotPresentation(): Promise<NetworkSnapshotPresentation> {
  let rows: Array<{
    scope: string;
    metric: string;
    value: number;
    timestamp: Date;
    source: string;
  }> = [];

  try {
    rows = await prisma.marketSnapshot.findMany({
      where: {
        OR: LIVE_METRICS.map((m) => ({
          scope: m.scope,
          metric: m.metric as any,
        })),
      },
      orderBy: { timestamp: 'desc' },
    });
  } catch {
    return {
      items: fallbackNetworkSnapshot,
      updatedLabel: 'Sample data — live feed not connected yet',
      usingAnyLiveData: false,
    };
  }

  const items: NetworkStat[] = [];
  const sourcesUsed = new Set<string>();
  let oldestTimestamp: Date | null = null;

  // Map the latest snapshot for each configured network metric.
  for (const def of LIVE_METRICS) {
    const latest = rows.find(
      (r) => r.scope === def.scope && r.metric === def.metric,
    );

    if (!latest) continue;

    sourcesUsed.add(latest.source);

    if (!oldestTimestamp || latest.timestamp < oldestTimestamp) {
      oldestTimestamp = latest.timestamp;
    }

    items.push({
      label: def.label,
      value:
        def.kind === 'usd'
          ? formatUsd(latest.value)
          : def.kind === 'pct'
            ? formatPct(latest.value)
            : `#${latest.value}`,
      trend: 'up',
    });
  }

  // Keep static network statistics alongside live metrics.
  for (const label of ['Active Protocols', 'Stock Tokens Listed']) {
    const fallbackStat = fallbackNetworkSnapshot.find((s) => s.label === label);

    if (fallbackStat) items.push(fallbackStat);
  }

  if (items.length === 0) {
    return {
      items: fallbackNetworkSnapshot,
      updatedLabel: 'Sample data — live feed not connected yet',
      usingAnyLiveData: false,
    };
  }

  const isStale = oldestTimestamp
    ? Date.now() - oldestTimestamp.getTime() > STALE_AFTER_MS
    : true;

  const updatedLabel = oldestTimestamp
    ? `${isStale ? 'Feed delayed — ' : ''}Last updated ${timeAgo(oldestTimestamp)} · via ${[...sourcesUsed].join(', ')}`
    : 'Sample data — live feed not connected yet';

  return {
    items,
    updatedLabel,
    usingAnyLiveData: true,
  };
}
