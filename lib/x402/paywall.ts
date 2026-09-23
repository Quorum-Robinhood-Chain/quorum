/**
 * Quorum x402 — the paywall.
 *
 * Wraps a route handler so that:
 *   1. No payment header  -> 402 Payment Required + `accepts` requirements
 *   2. Payment header     -> verify, record usage, return the data
 *   3. Dev preview key    -> skip payment, mark the response as unpaid
 *
 * The verification step is deliberately the ONLY place that decides
 * whether data is released. Adding a new priced endpoint means wrapping
 * it here, not re-implementing the check.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  DEV_PREVIEW_KEY,
  PAY_TO,
  RATE_LIMIT_PER_MINUTE,
  X402_ASSET_ADDRESS,
  X402_ASSET_SYMBOL,
  X402_LIVE,
  X402_MODE,
  X402_NETWORK,
  findEndpoint,
  priceFor,
  toBaseUnits,
  type EndpointId,
} from "./config";
import { recentCallCount, recordUsage } from "./usage";
import { holdsDiscountBalance } from "./holder";

const RATE_LIMIT_WINDOW_MS = 60_000;

export interface PaidContext {
  /** Paying agent address, or null under the dev preview key. */
  agent: string | null;
  /** Whether the holder discount applied. */
  isHolder: boolean;
  /** Price actually charged, decimal USDG. */
  price: string;
  paid: boolean;
}

type Handler = (
  req: NextRequest,
  ctx: PaidContext
) => Promise<unknown> | unknown;

export function withX402(endpointId: EndpointId, handler: Handler) {
  return async function route(req: NextRequest): Promise<NextResponse> {
    const spec = findEndpoint(endpointId);

    // ── Dev preview bypass ────────────────────────────────────────────
    const devKey = req.headers.get("x-quorum-dev-key");
    if (DEV_PREVIEW_KEY && devKey === DEV_PREVIEW_KEY) {
      const body = await handler(req, {
        agent: null,
        isHolder: false,
        price: "0",
        paid: false,
      });
      if (body instanceof NextResponse) return body;
      return json(body, { "x-quorum-payment": "dev-preview" });
    }

    // ── Payment presented? ────────────────────────────────────────────
    const paymentHeader =
      req.headers.get("x-payment") ?? req.headers.get("payment-signature");

    if (!paymentHeader) {
      return challenge(spec.id, await quoteFor(req, spec.id));
    }

    const verified = await verifyPayment(paymentHeader, spec.id);
    if (!verified.ok) {
      return NextResponse.json(
        {
          error: "payment_invalid",
          reason: verified.reason,
          hint: "Retry the request with a valid X-PAYMENT header. GET /api/catalog lists current prices.",
        },
        { status: 402 }
      );
    }

    // ── Per-payer rate limit ──────────────────────────────────────────
    // A courtesy throttle on top of payment verification, not a
    // replacement for it. Counted against the same x402_calls table
    // usage tracking writes to, so it holds across serverless instances
    // (an in-memory counter would reset per invocation on Vercel).
    const recentCalls = await recentCallCount(verified.agent, RATE_LIMIT_WINDOW_MS);
    if (recentCalls >= RATE_LIMIT_PER_MINUTE) {
      return NextResponse.json(
        {
          error: "rate_limited",
          reason: "too_many_requests",
          limit: RATE_LIMIT_PER_MINUTE,
          window_seconds: RATE_LIMIT_WINDOW_MS / 1000,
          hint: "Slow down and retry after the window resets. This call was not billed.",
        },
        { status: 429, headers: { "retry-after": String(RATE_LIMIT_WINDOW_MS / 1000) } }
      );
    }

    const isHolder = await holdsDiscountBalance(verified.agent);
    const price = priceFor(spec, isHolder);

    const body = await handler(req, {
      agent: verified.agent,
      isHolder,
      price,
      paid: true,
    });

    // An error response is not a delivered answer: don't bill it, and
    // don't inflate the usage counter with it.
    // TODO (live mode): issue a refund for a settled payment that
    // produced a 4xx/5xx, or quote-then-settle so it never settles.
    if (body instanceof NextResponse) return body;

    await recordUsage({
      agent: verified.agent,
      endpoint: spec.id,
      amount: price,
      txHash: verified.txHash,
    });

    return json(body, {
      "x-quorum-payment": "settled",
      "x-quorum-price": price,
      "x-quorum-holder-discount": isHolder ? "applied" : "none",
    });
  };
}

/** Build the 402 body an agent needs in order to pay and retry. */
async function quoteFor(req: NextRequest, id: EndpointId) {
  const spec = findEndpoint(id);
  // The caller is unauthenticated here, so quote the list price and let
  // the discount apply on settlement.
  return {
    price: spec.price,
    baseUnits: toBaseUnits(spec.price),
    resource: new URL(req.url).pathname,
  };
}

function challenge(
  id: EndpointId,
  quote: { price: string; baseUnits: string; resource: string }
): NextResponse {
  const spec = findEndpoint(id);

  return NextResponse.json(
    {
      x402Version: 2,
      error: "payment_required",
      mode: X402_MODE,
      accepts: [
        {
          scheme: "exact",
          network: X402_NETWORK,
          asset: X402_ASSET_ADDRESS || null,
          assetSymbol: X402_ASSET_SYMBOL,
          maxAmountRequired: quote.baseUnits,
          amountDecimal: quote.price,
          payTo: PAY_TO || null,
          resource: quote.resource,
          description: spec.summary,
          maxTimeoutSeconds: 300,
        },
      ],
      ...(X402_LIVE
        ? {}
        : {
            notice:
              "Dev preview: payment rails are not armed yet. This endpoint returns its 402 shape so you can integrate against it today. Ask for a dev key to receive live data.",
          }),
    },
    {
      status: 402,
      headers: {
        "x-quorum-mode": X402_MODE,
        "cache-control": "no-store",
      },
    }
  );
}

/**
 * Verify a presented payment.
 *
 * PROTOTYPE: in dev-preview mode this only checks that the header is
 * well-formed and extracts the payer, so integrators can exercise the
 * happy path. It NEVER returns ok in live mode without settlement —
 * wire a facilitator (verify + settle) before flipping X402_MODE=live.
 */
async function verifyPayment(
  header: string,
  _endpoint: EndpointId
): Promise<
  | { ok: true; agent: string; txHash: string | null }
  | { ok: false; reason: string }
> {
  let decoded: Record<string, unknown>;
  try {
    const raw = header.trim().startsWith("{")
      ? header
      : Buffer.from(header, "base64").toString("utf8");
    decoded = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "header_not_decodable" };
  }

  const payload = (decoded.payload ?? decoded) as Record<string, unknown>;
  const agent =
    (payload.from as string) ??
    (payload.payer as string) ??
    (payload.authorization as { from?: string } | undefined)?.from;

  if (!agent || !/^0x[0-9a-fA-F]{40}$/.test(agent)) {
    return { ok: false, reason: "payer_address_missing_or_malformed" };
  }

  if (X402_LIVE) {
    // TODO: settle via facilitator, then return its tx hash.
    return { ok: false, reason: "facilitator_not_configured" };
  }

  return { ok: true, agent: agent.toLowerCase(), txHash: null };
}

function json(body: unknown, headers: Record<string, string>): NextResponse {
  return NextResponse.json(body, {
    status: 200,
    headers: { ...headers, "cache-control": "no-store" },
  });
}
