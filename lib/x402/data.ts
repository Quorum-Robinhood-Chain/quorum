/**
 * Data adapters for the x402 endpoints.
 *
 * Each function is the seam between the paid API and Quorum's existing
 * pipeline: Prisma (`MarketSnapshot`, `Token`, `Article`) and the same
 * Dexscreener/scoring logic lib/market/pulse.ts already uses for the
 * market_pulse article template. Reusing that logic (rather than a
 * second copy of the thresholds) is the point — this is the same
 * "published thresholds, not a black box" pipeline that writes the site.
 *
 * Every payload carries `sources` and `as_of`, for the same reason the
 * articles do: a number an agent cannot trace is a number it cannot act
 * on.
 */

import { prisma } from "@/lib/db";
import { fetchDexscreenerActivityByTokenAddress } from "@/lib/market/dexscreener";
import {
  HIGH_VOLUME_TO_LIQUIDITY,
  ONE_SIDED_MIN_TRADES,
  ONE_SIDED_SHARE,
  THIN_LIQUIDITY_USD,
  computeMarketPulse,
  scoreToken,
} from "@/lib/market/pulse";
import { getEcosystemPresentation } from "@/lib/presenters/ecosystem";
import { isGated } from "@/lib/gating";

export interface SentimentPayload {
  token: string;
  score: number; // -2..+2
  tone: "bullish" | "leaning bullish" | "neutral" | "leaning bearish" | "bearish";
  price_usd: number | null;
  price_change_24h: number | null;
  buy_share: number | null;
  sources: string[];
  as_of: string;
}

export interface FlagsPayload {
  token: string;
  flags: string[];
  liquidity_usd: number;
  volume_24h_usd: number;
  vol_to_liq: number | null;
  txns_24h: number;
  sources: string[];
  as_of: string;
}

const nowIso = () => new Date().toISOString();

/** Map a raw score to Quorum's published tone ladder. */
export function toneFor(score: number): SentimentPayload["tone"] {
  if (score >= 2) return "bullish";
  if (score === 1) return "leaning bullish";
  if (score === 0) return "neutral";
  if (score === -1) return "leaning bearish";
  return "bearish";
}

/**
 * Quorum's published warning thresholds, applied in one place. Same
 * numbers as lib/market/pulse.ts (imported, not re-declared) — this is
 * the "same thresholds we print in articles even when they ruin the
 * story" promise made on /agents.
 */
export function flagsFor(input: {
  liquidityUsd: number;
  volume24hUsd: number;
  txns24h: number;
  buyShare: number | null;
}): string[] {
  const flags: string[] = [];
  if (input.liquidityUsd < THIN_LIQUIDITY_USD) flags.push("thin_liquidity");
  if (
    input.liquidityUsd > 0 &&
    input.volume24hUsd > input.liquidityUsd * HIGH_VOLUME_TO_LIQUIDITY
  )
    flags.push("vol_to_liq_10x");
  if (
    input.buyShare != null &&
    input.txns24h >= ONE_SIDED_MIN_TRADES &&
    (input.buyShare >= ONE_SIDED_SHARE || input.buyShare <= 1 - ONE_SIDED_SHARE)
  )
    flags.push("one_sided_flow");
  return flags;
}

/** Resolve a ticker to a tracked, on-chain token — or null if unknown. */
async function findTrackedToken(symbol: string) {
  return prisma.token.findFirst({
    where: {
      symbol: symbol.toUpperCase(),
      isTracked: true,
      NOT: { contractAddress: null },
    },
    select: { symbol: true, contractAddress: true },
  });
}

// ── Adapters ────────────────────────────────────────────────────────────

export async function getSentiment(
  token: string
): Promise<SentimentPayload | null> {
  const row = await findTrackedToken(token);
  if (!row?.contractAddress) return null;

  const activity = await fetchDexscreenerActivityByTokenAddress(row.contractAddress);
  if (!activity) return null;

  const trades = (activity.buys24h ?? 0) + (activity.sells24h ?? 0);
  const buyShare =
    activity.buys24h != null && activity.sells24h != null && trades > 0
      ? activity.buys24h / trades
      : null;

  // No price move and no buy/sell split: there is nothing to score.
  if (activity.priceChange24hPct == null && buyShare == null) return null;

  const score = scoreToken(activity.priceChange24hPct, buyShare);

  return {
    token: row.symbol,
    score,
    tone: toneFor(score),
    price_usd: activity.priceUsd,
    price_change_24h:
      activity.priceChange24hPct != null
        ? Number(activity.priceChange24hPct.toFixed(2))
        : null,
    buy_share: buyShare != null ? Number(buyShare.toFixed(2)) : null,
    sources: ["dexscreener", "rpc:4663"],
    as_of: nowIso(),
  };
}

export async function getFlags(token: string): Promise<FlagsPayload | null> {
  const row = await findTrackedToken(token);
  if (!row?.contractAddress) return null;

  const activity = await fetchDexscreenerActivityByTokenAddress(row.contractAddress);
  if (!activity) return null;

  const liquidityUsd = activity.liquidityUsd ?? 0;
  const volume24hUsd = activity.volume24hUsd ?? 0;
  const buys = activity.buys24h ?? 0;
  const sells = activity.sells24h ?? 0;
  const txns24h = buys + sells;
  const buyShare = txns24h > 0 ? buys / txns24h : null;

  return {
    token: row.symbol,
    flags: flagsFor({ liquidityUsd, volume24hUsd, txns24h, buyShare }),
    liquidity_usd: Math.round(liquidityUsd),
    volume_24h_usd: Math.round(volume24hUsd),
    vol_to_liq: liquidityUsd > 0 ? Number((volume24hUsd / liquidityUsd).toFixed(2)) : null,
    txns_24h: txns24h,
    sources: ["dexscreener", "rpc:4663"],
    as_of: nowIso(),
  };
}

export async function getPulse() {
  // Same computation the market_pulse article template uses — one
  // pipeline, one set of numbers, whether a human or an agent reads it.
  const pulse = await computeMarketPulse();

  const avgScore = pulse.tokens.length
    ? pulse.tokens.reduce((sum, t) => sum + t.score, 0) / pulse.tokens.length
    : 0;

  return {
    tone: pulse.summary.tone,
    avg_score: Number(avgScore.toFixed(2)),
    bullish: pulse.summary.bullishTokens,
    bearish: pulse.summary.bearishTokens,
    tokens_scored: pulse.summary.tokensAnalyzed,
    sources: ["dexscreener", "rpc:4663"],
    as_of: nowIso(),
  };
}

export async function getSnapshot() {
  const [chainSnapshots, ecosystem, stockTokensListed, movers] = await Promise.all([
    prisma.marketSnapshot.findMany({
      where: {
        scope: "chain",
        metric: { in: ["tvl", "volume_24h", "dex_volume_rank"] },
      },
      orderBy: { timestamp: "desc" },
    }),
    getEcosystemPresentation(),
    prisma.token.count({ where: { category: "stock_token", isTracked: true } }),
    getStockTokenMovers(),
  ]);

  const latestByMetric = new Map<string, { value: number; source: string }>();
  for (const s of chainSnapshots) {
    if (!latestByMetric.has(s.metric)) {
      latestByMetric.set(s.metric, { value: s.value, source: s.source });
    }
  }

  const tvl = latestByMetric.get("tvl");
  const volume = latestByMetric.get("volume_24h");
  const rank = latestByMetric.get("dex_volume_rank");

  const sources = new Set(["rpc:4663"]);
  for (const m of latestByMetric.values()) sources.add(m.source);

  return {
    chain: "robinhood-chain",
    chain_id: 4663,
    tvl_usd: tvl?.value ?? null,
    dex_volume_24h_usd: volume?.value ?? null,
    dex_volume_rank: rank?.value ?? null,
    active_protocols: ecosystem.protocols.length,
    stock_tokens_listed: stockTokensListed,
    movers,
    sources: [...sources],
    as_of: nowIso(),
  };
}

async function getStockTokenMovers(limit = 5) {
  const tokens = await prisma.token.findMany({
    where: { category: "stock_token", isTracked: true },
    select: { symbol: true },
  });
  if (tokens.length === 0) return [];

  const scopes = tokens.map((t) => `token:${t.symbol}`);

  const [priceRows, changeRows] = await Promise.all([
    prisma.marketSnapshot.findMany({
      where: { scope: { in: scopes }, metric: "price" },
      orderBy: { timestamp: "desc" },
      distinct: ["scope"],
    }),
    prisma.marketSnapshot.findMany({
      where: { scope: { in: scopes }, metric: "price_change_24h" },
      orderBy: { timestamp: "desc" },
      distinct: ["scope"],
    }),
  ]);

  const priceByScope = new Map(priceRows.map((r) => [r.scope, r.value]));
  const changeByScope = new Map(changeRows.map((r) => [r.scope, r.value]));

  return [...changeByScope.entries()]
    .map(([scope, changePct]) => ({
      symbol: scope.replace(/^token:/, ""),
      price_usd: priceByScope.get(scope) ?? null,
      price_change_24h: Number(changePct.toFixed(2)),
    }))
    .sort((a, b) => Math.abs(b.price_change_24h) - Math.abs(a.price_change_24h))
    .slice(0, limit);
}

export async function getNews(limit = 5) {
  // Published AND ungated only — the same rule the reader-side gate
  // applies (lib/gating.ts). An agent paying $0.01/call gets nothing an
  // unpaid human reader couldn't also see for free once the gate window
  // passes; it never bypasses the gate.
  const rows = await prisma.article.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: limit * 3, // over-fetch, then filter out anything still gated
  });

  const items = rows
    .filter((a) => !isGated(a.publishedAt ?? a.generatedAt))
    .slice(0, limit)
    .map((a) => ({
      headline: a.headline,
      dek: a.dek ?? "",
      category: a.category,
      published_at: (a.publishedAt ?? a.generatedAt).toISOString(),
      sources: a.sourceNames,
    }));

  return {
    items,
    sources: ["quorum:generate"],
    as_of: nowIso(),
  };
}
