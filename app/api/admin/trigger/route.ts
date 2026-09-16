import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { ingestBeInCrypto } from "@/lib/services/sources/beincrypto";
import { ingestCoinfomania } from "@/lib/services/sources/coinfomania";
import { refreshMarketData } from "@/lib/services/market/refresh";
import { generateArticle } from "@/lib/llm/generate";

export const dynamic = "force-dynamic";
// Generation (LLM call) is the slowest job here — give it room on Vercel.
// Raise this further (or split generate into its own route) if it still times out
// on your plan's max duration.
export const maxDuration = 60;

type Job = "ingest-beincrypto" | "ingest-coinfomania" | "refresh-market-data" | "generate";

/**
 * Runs a job immediately and synchronously — no queue, no persistent worker. Meant to be
 * called either by hand (admin session cookie), or by an external scheduler on a cadence
 * (Vercel Cron, GitHub Actions, cron-job.org, etc.) using the `x-cron-secret` header, since
 * this is now a plain serverless function rather than something that enqueues work for a
 * long-running BullMQ worker to pick up later.
 */
export async function POST(req: NextRequest) {
  const username = await requireAdminSession(req);
  const cronSecret = req.headers.get("x-cron-secret");
  const validCronSecret = cronSecret && cronSecret === process.env.CRON_TRIGGER_SECRET;

  if (!username && !validCronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { job?: Job; forceTemplate?: string };

  try {
    switch (body.job) {
      case "ingest-beincrypto": {
        const result = await ingestBeInCrypto();
        return NextResponse.json({ ok: true, job: body.job, result });
      }
      case "ingest-coinfomania": {
        const result = await ingestCoinfomania();
        return NextResponse.json({ ok: true, job: body.job, result });
      }
      case "refresh-market-data": {
        const result = await refreshMarketData();
        return NextResponse.json({ ok: true, job: body.job, result });
      }
      case "generate": {
        const result = await generateArticle(body.forceTemplate as any);
        return NextResponse.json({ ok: true, job: body.job, result });
      }
      default:
        return NextResponse.json(
          { error: "job must be one of: ingest-beincrypto, ingest-coinfomania, refresh-market-data, generate" },
          { status: 400 },
        );
    }
  } catch (err) {
    return NextResponse.json({ ok: false, job: body.job, error: (err as Error).message }, { status: 500 });
  }
}
