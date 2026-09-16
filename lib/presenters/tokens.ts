import { prisma } from "@/lib/db/client";
import { formatUsd, formatPct } from "@/lib/utils/format";
import { trendingTokens as fallbackTokens } from "@/data/tokens";
import type { TokenCategory, TokenRow } from "@/types";

const VALID_CATEGORIES: TokenCategory[] = ["stock_token", "defi", "meme"];

function toTokenCategory(raw: string): TokenCategory {
  return (VALID_CATEGORIES as string[]).includes(raw) ? (raw as TokenCategory) : "defi";
}

export interface TokensPresentation {
  tokens: TokenRow[];
  usingLiveData: boolean;
}

/**
 * Reads tracked tokens + their latest price/volume snapshot from the DB. Used by
 * `app/api/tokens/route.ts` and directly by `TokensSection`/`MarketsOverview` (no self-fetch
 * over HTTP). Falls back to the static `data/tokens.ts` set whenever no tokens are seeded yet
 * or the DB isn't reachable.
 */
export async function getTokensPresentation(): Promise<TokensPresentation> {
  try {
    const tokens = await prisma.token.findMany({ where: { isTracked: true } });
    if (tokens.length === 0) {
      return { tokens: fallbackTokens, usingLiveData: false };
    }

    const snapshots = await prisma.marketSnapshot.findMany({
      where: { scope: { startsWith: "token:" } },
      orderBy: { timestamp: "desc" },
    });

    const latestByScope = new Map<string, typeof snapshots>();
    for (const s of snapshots) {
      const arr = latestByScope.get(s.scope) ?? [];
      if (!arr.find((x: any) => x.metric === s.metric)) arr.push(s);
      latestByScope.set(s.scope, arr);
    }

    let anyLive = false;
    const rows: TokenRow[] = tokens.map((t: any) => {
      const scoped = latestByScope.get(`token:${t.symbol}`) ?? [];
      const price = scoped.find((s: any) => s.metric === "price")?.value ?? null;
      const change = scoped.find((s: any) => s.metric === "price_change_24h")?.value ?? null;
      const volume = scoped.find((s: any) => s.metric === "volume_24h")?.value ?? null;
      if (price != null || volume != null) anyLive = true;

      return {
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        dex: t.dex ?? "—",
        category: toTokenCategory(t.category),
        price: price != null ? formatUsd(price) : "—",
        change24h: change != null ? formatPct(change) : "—",
        isUp: change == null || change >= 0,
        volume24h: volume != null ? formatUsd(volume) : "—",
      };
    });

    return { tokens: rows, usingLiveData: anyLive };
  } catch {
    return { tokens: fallbackTokens, usingLiveData: false };
  }
}
