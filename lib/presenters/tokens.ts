import { prisma } from '@/lib/db';
import { formatUsd, formatPct } from '@/lib/format';
import { trendingTokens as fallbackTokens } from '@/data/tokens';
import type { TokenCategory, TokenRow } from '@/types';

const VALID_CATEGORIES: TokenCategory[] = ['stock_token', 'defi', 'meme'];

function toTokenCategory(raw: string): TokenCategory {
  return (VALID_CATEGORIES as string[]).includes(raw) ? (raw as TokenCategory) : 'defi';
}

export interface TokensPresentation {
  tokens: TokenRow[];
  usingLiveData: boolean;
}

interface Snapshot {
  scope: string;
  metric: string;
  value: number;
}

function latestFor(snapshots: Snapshot[], symbol: string) {
  const scope = `token:${symbol}`;
  const pick = (metric: string) => snapshots.find((s) => s.scope === scope && s.metric === metric)?.value ?? null;

  return { price: pick('price'), change: pick('price_change_24h'), volume: pick('volume_24h') };
}

export async function getTokensPresentation(): Promise<TokensPresentation> {
  try {
    const tokens = await prisma.token.findMany({ where: { isTracked: true } });
    if (tokens.length === 0) return { tokens: fallbackTokens, usingLiveData: false };

    // One query, newest first; the first hit per (scope, metric) is the current value.
    const rows = await prisma.marketSnapshot.findMany({
      where: { scope: { startsWith: 'token:' } },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    const seen = new Set<string>();
    const snapshots: Snapshot[] = rows.filter((row) => {
      const key = `${row.scope}:${row.metric}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const priced = tokens
      .map((token) => {
        const { price, change, volume } = latestFor(snapshots, token.symbol);

        return {
          hasData: price != null || volume != null,
          sortKey: volume ?? price ?? 0,
          row: {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            dex: token.dex ?? '—',
            category: toTokenCategory(token.category),
            price: price != null ? formatUsd(price) : '—',
            change24h: change != null ? formatPct(change) : '—',
            isUp: change == null || change >= 0,
            volume24h: volume != null ? formatUsd(volume) : '—',
          } satisfies TokenRow,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);

    // Nothing has been priced yet — show the sample set rather than a wall of dashes.
    if (!priced.some((t) => t.hasData)) {
      return { tokens: fallbackTokens, usingLiveData: false };
    }

    // Drop tokens with no numbers at all: a tracked-but-unpriced row tells the reader nothing.
    return { tokens: priced.filter((t) => t.hasData).map((t) => t.row), usingLiveData: true };
  } catch {
    return { tokens: fallbackTokens, usingLiveData: false };
  }
}
