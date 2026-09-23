/**
 * Quorum x402 — usage tracking.
 *
 * Counts paid calls per agent so /api/v1/stats and the /agents page can
 * show real adoption numbers. Backed by Postgres via Prisma (the
 * `X402Call` model / `x402_calls` table — see prisma/schema.prisma).
 *
 * ── Honesty contract ───────────────────────────────────────────────────
 * Until the first real payment settles, this module serves a SEEDED DEMO
 * dataset and every response that touches it is stamped `mode: "demo"`.
 * The moment one real call is recorded, `mode` flips to "live" and the
 * demo rows are excluded from every figure. No code change, no redeploy.
 *
 * We do this because Quorum's entire pitch is "check our numbers". An
 * unlabelled fake counter is the one thing that would make that pitch
 * indefensible.
 * ───────────────────────────────────────────────────────────────────────
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CATALOG, type EndpointId } from "./config";

export interface UsageStats {
  mode: "demo" | "live";
  total_calls: number;
  unique_agents: number;
  calls_24h: number;
  usdg_spent: string;
  by_endpoint: Record<string, number>;
  first_call_at: string | null;
  last_call_at: string | null;
  /** Present only while mode is "demo". */
  disclaimer?: string;
}

const DEMO_DISCLAIMER =
  "Seeded demo data. The x402 API is in dev preview and has not settled real payments yet. This counter switches to live figures automatically on the first paid call.";

/** ── Seeded demo dataset: 39 calls, 7 autonomous agents, last ~26h ── */
function seedDemoRows(): Array<{
  agent: string;
  endpoint: EndpointId;
  amount: string;
  createdAt: Date;
  demo: true;
}> {
  const agents = [
    "0x7a1f9c4e2b8d05a3f6c1e9b47d2085fa3c6e1b94",
    "0x3e8b2d6a91f4c05e7b3a8d21f6c90e4b7a2d5f18",
    "0xc4d90a71e35b82f6a0d417c9b62e5083fa1d7e46",
    "0x91f6e0b38a2c74d5091fe6b3a84c27d50e9b1f63",
    "0x5b2a7f09c86e14d3b90a5f72e8c604d1a37be925",
    "0xe07c3a95b1d648f20ea9c73b5081df64a2c9e370",
    "0x2d84b019fa63c5e7108d4b92a75fe3016c8da247",
  ];

  const plan: Array<[number, EndpointId, number]> = [
    [0, "sentiment", 8],
    [0, "flags", 4],
    [1, "pulse", 6],
    [1, "news", 3],
    [2, "sentiment", 5],
    [3, "flags", 4],
    [4, "snapshot", 3],
    [5, "news", 3],
    [6, "sentiment", 2],
    [6, "snapshot", 1],
  ];

  const priceOf = (id: EndpointId) => CATALOG.find((e) => e.id === id)!.price;

  const now = Date.now();
  const windowMs = 26 * 60 * 60 * 1000;
  const out: ReturnType<typeof seedDemoRows> = [];
  let step = 0;
  const total = plan.reduce((n, [, , c]) => n + c, 0);

  for (const [agentIdx, endpoint, count] of plan) {
    for (let i = 0; i < count; i++) {
      const at = now - Math.round((windowMs * (total - step)) / (total + 1));
      out.push({
        agent: agents[agentIdx],
        endpoint,
        amount: priceOf(endpoint),
        createdAt: new Date(at),
        demo: true,
      });
      step++;
    }
  }
  return out;
}

/**
 * Insert the seed dataset once, on first use, if the table is still
 * empty. Guarded per-process so a burst of concurrent requests doesn't
 * race to insert it twice; the empty-table check makes it idempotent
 * across process restarts and deploys too.
 */
let seedAttempted = false;
async function ensureSeeded(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;

  try {
    const count = await prisma.x402Call.count();
    if (count > 0) return;

    await prisma.x402Call.createMany({
      data: seedDemoRows(),
    });
  } catch {
    // No DB configured yet, or the migration hasn't been applied. Let
    // getStats/getRecentCalls fail open to empty results rather than
    // crash the free stats endpoint — see their try/catch below.
  }
}

/** True once at least one non-demo call has been recorded. */
async function hasRealUsage(): Promise<boolean> {
  const real = await prisma.x402Call.count({ where: { demo: false } });
  return real > 0;
}

/** Record a settled paid call. Call this only AFTER payment verification. */
export async function recordUsage(input: {
  agent: string;
  endpoint: EndpointId;
  amount: string;
  txHash?: string | null;
}): Promise<void> {
  await ensureSeeded();
  await prisma.x402Call.create({
    data: {
      agent: input.agent.toLowerCase(),
      endpoint: input.endpoint,
      amount: new Prisma.Decimal(input.amount),
      txHash: input.txHash ?? null,
      demo: false,
    },
  });
}

export async function getStats(): Promise<UsageStats> {
  try {
    await ensureSeeded();
    const live = await hasRealUsage();

    const rows = await prisma.x402Call.findMany({
      where: { demo: !live },
      orderBy: { createdAt: "asc" },
    });

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const byEndpoint: Record<string, number> = {};
    let spent = 0;

    for (const r of rows) {
      byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] ?? 0) + 1;
      spent += Number(r.amount);
    }

    const stats: UsageStats = {
      mode: live ? "live" : "demo",
      total_calls: rows.length,
      unique_agents: new Set(rows.map((r) => r.agent)).size,
      calls_24h: rows.filter((r) => r.createdAt >= dayAgo).length,
      usdg_spent: spent.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") || "0",
      by_endpoint: byEndpoint,
      first_call_at: rows.length ? rows[0].createdAt.toISOString() : null,
      last_call_at: rows.length
        ? rows[rows.length - 1].createdAt.toISOString()
        : null,
    };

    if (!live) stats.disclaimer = DEMO_DISCLAIMER;
    return stats;
  } catch {
    return {
      mode: "demo",
      total_calls: 0,
      unique_agents: 0,
      calls_24h: 0,
      usdg_spent: "0",
      by_endpoint: {},
      first_call_at: null,
      last_call_at: null,
      disclaimer:
        "Usage store unavailable (DATABASE_URL not configured or migrations not applied). Run `npx prisma migrate deploy`.",
    };
  }
}

/** Recent calls, newest first, with agent addresses truncated. */
export async function getRecentCalls(limit = 10) {
  try {
    await ensureSeeded();
    const live = await hasRealUsage();

    const rows = await prisma.x402Call.findMany({
      where: { demo: !live },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((r) => ({
      agent: `${r.agent.slice(0, 6)}…${r.agent.slice(-4)}`,
      endpoint: r.endpoint,
      amount: r.amount.toString(),
      tx: r.txHash,
      at: r.createdAt.toISOString(),
      demo: r.demo,
    }));
  } catch {
    return [];
  }
}

/**
 * Calls made by `agent` in the last `windowMs`. Used by the per-payer
 * rate limit in paywall.ts. A DB error fails OPEN here (returns 0) so a
 * transient outage degrades to "no rate limiting" rather than blocking
 * every paying agent — payment verification is the hard gate; this is a
 * courtesy throttle on top of it.
 */
export async function recentCallCount(
  agent: string,
  windowMs: number,
): Promise<number> {
  try {
    return await prisma.x402Call.count({
      where: {
        agent: agent.toLowerCase(),
        demo: false,
        createdAt: { gte: new Date(Date.now() - windowMs) },
      },
    });
  } catch {
    return 0;
  }
}
