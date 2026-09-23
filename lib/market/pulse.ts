import { prisma } from '@/lib/db';
import {
  fetchDexscreenerActivityByTokenAddress,
  type DexscreenerActivity,
} from './dexscreener';

const PULSE_CATEGORIES = ['trending', 'defi'] as const;

// How many tokens (ranked by latest 24h volume) get a live activity lookup per run.
const MAX_TOKENS = 10;

// Below this pair liquidity, price moves can be exaggerated by a single trade.
// Exported so lib/x402/data.ts can flag the exact same threshold instead of
// re-declaring it — "published thresholds, not a black box" only holds if
// there is one copy of the number.
export const THIN_LIQUIDITY_USD = 50_000;

// 24h volume more than this many times the pool's liquidity is unusual churn. It can
// be organic hype OR self-trading (wash trading), so it is only ever an INDICATOR.
export const HIGH_VOLUME_TO_LIQUIDITY = 10;

// Buy or sell share this lopsided (with enough trades) is flagged as one-sided flow.
export const ONE_SIDED_SHARE = 0.85;
export const ONE_SIDED_MIN_TRADES = 50;

export function xSearchUrl(symbol: string): string {
  return `https://x.com/search?q=${encodeURIComponent('$' + symbol)}&f=live`;
}

export type Tone =
  | 'bullish'
  | 'leaning bullish'
  | 'neutral'
  | 'leaning bearish'
  | 'bearish';

export interface PulseToken {
  symbol: string;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buySharePct: number | null;
  thinLiquidity: boolean;
  // Raw -2..+2 score before the 0-100 rescale below — same formula as
  // scoreToken(), kept per-token for callers (e.g. the x402 pulse endpoint)
  // that need to average it directly.
  score: number;
  // 0-100 market sentiment score from price change + buy/sell share (50 = neutral).
  sentimentScore: number;
  tone: Tone;
  // Deterministic red flags — indicators only, never proof of wrongdoing.
  warnings: string[];
  pairUrl: string;
}

export interface MarketPulse {
  tokens: PulseToken[];
  summary: {
    tokensAnalyzed: number;
    advancers: number;
    decliners: number;
    totalVolume24hUsd: number;
    overallBuySharePct: number | null;
    medianPriceChange24hPct: number | null;
    // Average of the per-token 0-100 scores.
    marketSentimentScore: number;
    // Tokens with tone bullish/leaning bullish vs bearish/leaning bearish.
    bullishTokens: number;
    bearishTokens: number;
    bullBearRatio: string;
    tokensWithWarnings: number;
    tone: 'risk-on' | 'mixed' | 'risk-off';
    method: string;
  };
}

const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

// Score in [-2, 2]: +1/-1 for price move beyond +/-5%, +1/-1 for buy share beyond 55%/45%.
// Exported so lib/x402/data.ts's sentiment endpoint scores tokens the same way
// this module does, instead of a second copy of the formula drifting over time.
export function scoreToken(
  change: number | null,
  buyShare: number | null,
): number {
  let score = 0;
  if (change != null) {
    if (change >= 5) score += 1;
    else if (change <= -5) score -= 1;
  }
  if (buyShare != null) {
    if (buyShare >= 0.55) score += 1;
    else if (buyShare <= 0.45) score -= 1;
  }
  return score;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

function sentimentScore(
  change: number | null,
  buyShare: number | null,
): number {
  let score = 50;
  if (change != null) score += (clamp(change, -20, 20) / 20) * 25;
  if (buyShare != null) score += clamp((buyShare - 0.5) / 0.25, -1, 1) * 25;
  return Math.round(clamp(score, 0, 100));
}

function scoreToTone(score: number): Tone {
  if (score >= 2) return 'bullish';
  if (score === 1) return 'leaning bullish';
  if (score === 0) return 'neutral';
  if (score === -1) return 'leaning bearish';
  return 'bearish';
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export async function computeMarketPulse(): Promise<MarketPulse> {
  const candidates = await prisma.token.findMany({
    where: {
      category: { in: [...PULSE_CATEGORIES] },
      isTracked: true,
      NOT: { contractAddress: null },
    },
    select: { symbol: true, contractAddress: true },
  });

  if (candidates.length === 0) return emptyPulse();

  // Rank by the latest known 24h volume so the busiest tokens are analyzed first.
  const volumeRows = await prisma.marketSnapshot.findMany({
    where: {
      metric: 'volume_24h',
      scope: { in: candidates.map((t) => `token:${t.symbol}`) },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['scope'],
    select: { scope: true, value: true },
  });
  const volumeByScope = new Map(volumeRows.map((r) => [r.scope, r.value]));

  const ranked = [...candidates]
    .sort(
      (a, b) =>
        (volumeByScope.get(`token:${b.symbol}`) ?? 0) -
        (volumeByScope.get(`token:${a.symbol}`) ?? 0),
    )
    .slice(0, MAX_TOKENS);

  const activity = await Promise.all(
    ranked.map(async (t) => ({
      symbol: t.symbol,
      data: await fetchDexscreenerActivityByTokenAddress(
        t.contractAddress as string,
      ),
    })),
  );

  const tokens: PulseToken[] = [];
  const scores: number[] = [];

  for (const { symbol, data } of activity) {
    if (!data) continue;
    const a: DexscreenerActivity = data;

    const trades = (a.buys24h ?? 0) + (a.sells24h ?? 0);
    const buyShare =
      a.buys24h != null && a.sells24h != null && trades > 0
        ? a.buys24h / trades
        : null;

    // Need at least a price move or a buy/sell split to say anything.
    if (a.priceChange24hPct == null && buyShare == null) continue;

    const score = scoreToken(a.priceChange24hPct, buyShare);
    scores.push(score);

    const warnings: string[] = [];
    const liquidity = a.liquidityUsd ?? 0;
    const volume = a.volume24hUsd ?? 0;
    if (liquidity < THIN_LIQUIDITY_USD) {
      warnings.push(
        'Thin liquidity: price moves can be exaggerated by a single trade.',
      );
    }
    if (liquidity > 0 && volume / liquidity > HIGH_VOLUME_TO_LIQUIDITY) {
      warnings.push(
        `24h volume is ${round(volume / liquidity, 0)}x the pool liquidity: unusual churn that can reflect hype or self-trading (wash trading). Indicator only, not proof.`,
      );
    }
    if (
      buyShare != null &&
      trades >= ONE_SIDED_MIN_TRADES &&
      (buyShare >= ONE_SIDED_SHARE || buyShare <= 1 - ONE_SIDED_SHARE)
    ) {
      warnings.push(
        `One-sided flow: ${round(buyShare * 100, 0)}% of 24h trades were buys, which is unusually lopsided.`,
      );
    }

    tokens.push({
      symbol,
      priceChange24hPct:
        a.priceChange24hPct != null ? round(a.priceChange24hPct) : null,
      volume24hUsd: a.volume24hUsd != null ? Math.round(a.volume24hUsd) : null,
      liquidityUsd: a.liquidityUsd != null ? Math.round(a.liquidityUsd) : null,
      buys24h: a.buys24h,
      sells24h: a.sells24h,
      buySharePct: buyShare != null ? round(buyShare * 100) : null,
      thinLiquidity: liquidity < THIN_LIQUIDITY_USD,
      score,
      sentimentScore: sentimentScore(a.priceChange24hPct, buyShare),
      tone: scoreToTone(score),
      warnings,
      pairUrl: a.pairUrl,
    });
  }

  if (tokens.length === 0) return emptyPulse();

  const changes = tokens
    .map((t) => t.priceChange24hPct)
    .filter((n): n is number => n != null);
  const totalBuys = tokens.reduce((n, t) => n + (t.buys24h ?? 0), 0);
  const totalSells = tokens.reduce((n, t) => n + (t.sells24h ?? 0), 0);
  const avgScore = scores.reduce((n, s) => n + s, 0) / scores.length;
  const bullishTokens = tokens.filter((t) => t.tone.includes('bullish')).length;
  const bearishTokens = tokens.filter((t) => t.tone.includes('bearish')).length;

  return {
    tokens,
    summary: {
      tokensAnalyzed: tokens.length,
      advancers: changes.filter((c) => c > 0).length,
      decliners: changes.filter((c) => c < 0).length,
      totalVolume24hUsd: tokens.reduce((n, t) => n + (t.volume24hUsd ?? 0), 0),
      overallBuySharePct:
        totalBuys + totalSells > 0
          ? round((totalBuys / (totalBuys + totalSells)) * 100)
          : null,
      medianPriceChange24hPct:
        median(changes) != null ? round(median(changes) as number) : null,
      marketSentimentScore: Math.round(
        tokens.reduce((n, t) => n + t.sentimentScore, 0) / tokens.length,
      ),
      bullishTokens,
      bearishTokens,
      bullBearRatio: `${bullishTokens} bullish : ${bearishTokens} bearish`,
      tokensWithWarnings: tokens.filter((t) => t.warnings.length > 0).length,
      tone:
        avgScore >= 0.75 ? 'risk-on' : avgScore <= -0.75 ? 'risk-off' : 'mixed',
      method:
        'Computed from Dexscreener 24h data for the most liquid pair of each token. ' +
        'sentimentScore is 0-100 (50 = neutral) from price change and buy/sell share. ' +
        'Tone: price change beyond +/-5% and a buy share above 55% / below 45% each count ' +
        'as one bullish / bearish signal. Warnings are indicators, not proof.',
    },
  };
}

function emptyPulse(): MarketPulse {
  return {
    tokens: [],
    summary: {
      tokensAnalyzed: 0,
      advancers: 0,
      decliners: 0,
      totalVolume24hUsd: 0,
      overallBuySharePct: null,
      medianPriceChange24hPct: null,
      marketSentimentScore: 50,
      bullishTokens: 0,
      bearishTokens: 0,
      bullBearRatio: '0 bullish : 0 bearish',
      tokensWithWarnings: 0,
      tone: 'mixed',
      method: '',
    },
  };
}
