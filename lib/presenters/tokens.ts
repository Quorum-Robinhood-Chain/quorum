import { prisma } from '@/lib/db';
import { formatUsd, formatPct } from '@/lib/format';
import { trendingTokens as fallbackTokens } from '@/data/tokens';
import type { TokenCategory, TokenRow } from '@/types';

const VALID_CATEGORIES: TokenCategory[] = [
  'stock_token',
  'defi',
  'meme',
  'trending',
];

function toTokenCategory(raw: string): TokenCategory {
  return (VALID_CATEGORIES as string[]).includes(raw)
    ? (raw as TokenCategory)
    : 'defi';
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
  const pick = (metric: string) =>
    snapshots.find((s) => s.scope === scope && s.metric === metric)?.value ??
    null;

  return {
    price: pick('price'),
    change: pick('price_change_24h'),
    volume: pick('volume_24h'),
  };
}

export async function getTokensPresentation(): Promise<TokensPresentation> {
  try {
    const tokens = await prisma.token.findMany({ where: { isTracked: true } });
    if (tokens.length === 0)
      return { tokens: fallbackTokens, usingLiveData: false };

    // DISTINCT ON (scope, metric) — the true latest value per token/metric,
    // with no cap on how many tokens that covers.
    //
    // A plain `findMany({ orderBy: timestamp desc, take: 500 })` (the old
    // approach) caps the *total rows scanned*, not rows-per-token. With
    // 190+ Stock Tokens alone writing price + volume_24h every 5 minutes,
    // that's 500+ rows from Stock Tokens by itself — enough to push a
    // freshly-discovered `trending` token's snapshot out of the window
    // entirely (worse: every row from one refreshMarketData() run shares
    // almost the same `timestamp`, so ordering among them isn't even
    // stable). A token that misses the cut gets `hasData: false` below and
    // is silently dropped from this list — which also means it drops out
    // of matchRelatedTokens() in lib/presenters/articles.ts, so a news
    // story that clearly mentions the token never gets its Dexscreener CA
    // link. DISTINCT ON removes that cap: it always returns exactly one
    // (freshest) row per (scope, metric), for every tracked token.
    const snapshots = await prisma.$queryRaw<Snapshot[]>`
      SELECT DISTINCT ON (scope, metric) scope, metric, value
      FROM "MarketSnapshot"
      WHERE scope LIKE 'token:%'
      ORDER BY scope, metric, timestamp DESC
    `;

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
            contractAddress: token.contractAddress ?? null,
            chainSlug: token.chainSlug ?? null,
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
    return {
      tokens: priced.filter((t) => t.hasData).map((t) => t.row),
      usingLiveData: true,
    };
  } catch {
    return { tokens: fallbackTokens, usingLiveData: false };
  }
}
