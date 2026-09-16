import { prisma } from "@/lib/db/client";
import { formatUsd, formatPct } from "@/lib/utils/format";
import type { TickerItem } from "@/types";

const TICKER_METRICS: Array<{ scope: string; metric: string; label: string; kind: "usd" | "pct" | "rank" }> = [
  { scope: "chain", metric: "tvl", label: "Robinhood Chain TVL", kind: "usd" },
  { scope: "chain", metric: "volume_24h", label: "24h DEX Volume", kind: "usd" },
  { scope: "protocol:morpho:usdg", metric: "apy", label: "USDG Lending APY", kind: "pct" },
  { scope: "chain", metric: "dex_volume_rank", label: "DEX Volume Rank", kind: "rank" },
];

const STALE_AFTER_MS = 10 * 60 * 1000; // §12: flag as stale if nothing refreshed in 10 min

export interface TickerPresentation {
  items: TickerItem[];
  lastUpdated: string | null;
  isStale: boolean;
}

/**
 * Reads the latest MarketSnapshot per ticker metric. Used directly by the TickerBar server
 * component (no HTTP round-trip to our own API) and by app/api/ticker/route.ts (for any
 * external/client-side consumer, e.g. a future client-rendered refresh).
 *
 * Returns an empty item list (not fake data) when nothing has been ingested yet — the caller
 * decides how to degrade gracefully (§12: "never show stale data as live").
 */
export async function getTickerPresentation(): Promise<TickerPresentation> {
  let rows: Array<{ scope: string; metric: string; value: number; timestamp: Date }> = [];

  try {
    rows = await prisma.marketSnapshot.findMany({
      where: { OR: TICKER_METRICS.map((m) => ({ scope: m.scope, metric: m.metric as any })) },
      orderBy: { timestamp: "desc" },
    });
  } catch {
    // DB not reachable / not migrated yet — degrade to "no live data" rather than throwing,
    // so the page still renders.
    return { items: [], lastUpdated: null, isStale: true };
  }

  const items: TickerItem[] = [];
  let oldestTimestamp: Date | null = null;

  for (const def of TICKER_METRICS) {
    const latest = rows.find((r) => r.scope === def.scope && r.metric === def.metric);
    if (!latest) continue;

    if (!oldestTimestamp || latest.timestamp < oldestTimestamp) oldestTimestamp = latest.timestamp;

    items.push({
      label: def.label,
      value: def.kind === "usd" ? formatUsd(latest.value) : def.kind === "pct" ? formatPct(latest.value) : `#${latest.value}`,
      change: "",
      isUp: true,
    });
  }

  const isStale = oldestTimestamp ? Date.now() - oldestTimestamp.getTime() > STALE_AFTER_MS : true;

  return { items, lastUpdated: oldestTimestamp?.toISOString() ?? null, isStale };
}
