import { prisma } from '@/lib/db';
import { formatUsd, formatPct } from '@/lib/format';
import { getTokensPresentation } from '@/lib/presenters/tokens';
import type { TickerItem } from '@/types';

const TICKER_METRICS: Array<{
  scope: string;
  metric: string;
  label: string;
  kind: 'usd' | 'pct' | 'rank';
}> = [
  {
    scope: 'chain',
    metric: 'tvl',
    label: 'Robinhood Chain TVL',
    kind: 'usd',
  },
  {
    scope: 'chain',
    metric: 'volume_24h',
    label: '24h DEX Volume',
    kind: 'usd',
  },
  {
    scope: 'protocol:morpho:usdg',
    metric: 'apy',
    label: 'USDG Lending APY',
    kind: 'pct',
  },
  {
    scope: 'chain',
    metric: 'dex_volume_rank',
    label: 'DEX Volume Rank',
    kind: 'rank',
  },
];

const STALE_AFTER_MS = 10 * 60 * 1000;
const TOKEN_TICKER_LIMIT = 10;

export interface TickerPresentation {
  items: TickerItem[];
  lastUpdated: string | null;
  isStale: boolean;
}

// Fetch the latest chain metrics and token prices for the market ticker.
export async function getTickerPresentation(): Promise<TickerPresentation> {
  let rows: Array<{
    scope: string;
    metric: string;
    value: number;
    timestamp: Date;
  }> = [];

  try {
    rows = await prisma.marketSnapshot.findMany({
      where: {
        OR: TICKER_METRICS.map((m) => ({
          scope: m.scope,
          metric: m.metric as any,
        })),
      },
      orderBy: { timestamp: 'desc' },
    });
  } catch {
    return {
      items: [],
      lastUpdated: null,
      isStale: true,
    };
  }

  const items: TickerItem[] = [];
  let oldestTimestamp: Date | null = null;

  // Add the latest snapshot for each configured chain metric.
  for (const def of TICKER_METRICS) {
    const latest = rows.find(
      (r) => r.scope === def.scope && r.metric === def.metric,
    );

    if (!latest) continue;

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
      change: '',
      isUp: true,
    });
  }

  // Add tracked token prices when live token data is available.
  try {
    const { tokens, usingLiveData } = await getTokensPresentation();

    if (usingLiveData) {
      for (const token of tokens.slice(0, TOKEN_TICKER_LIMIT)) {
        if (token.price === '—') continue;

        items.push({
          label: token.symbol,
          value: token.price,
          change: token.change24h === '—' ? '' : token.change24h,
          isUp: token.isUp,
        });
      }
    }
  } catch {
    // Token data is optional; chain metrics can still populate the ticker.
  }

  const isStale = oldestTimestamp
    ? Date.now() - oldestTimestamp.getTime() > STALE_AFTER_MS
    : true;

  return {
    items,
    lastUpdated: oldestTimestamp?.toISOString() ?? null,
    isStale,
  };
}
