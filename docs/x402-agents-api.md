> **Merge note:** this is the original prototype README, kept for
> context. Since it was written, items 2–3 below (live data, Prisma
> usage store) and the rate-limit item have been implemented against
> this repo's actual Prisma models — see the "🤖 /agents" section of the
> main README for the current state. Item 1 (facilitator) and the
> refund-on-4xx TODO in `paywall.ts` are still open. The env section
> below also predates the merge: `holder.ts` now reuses
> `lib/wallet/quorumToken.ts`, so `ROBINHOOD_RPC_URL` /
> `QUORUM_TOKEN_ADDRESS` / `QUORUM_TOKEN_DECIMALS` are NOT separate x402
> vars — they're the same `QUORUM_TOKEN_RPC_URL` (or `RHC_RPC_URL`) /
> `QUORUM_TOKEN_ADDRESS` / `QUORUM_TOKEN_DECIMALS` / `QUORUM_MIN_BALANCE`
> already in `.env.example`.

# Quorum × x402 — agent API prototype

Drop-in prototype for the `/agents` section and the paid endpoints behind it.
Built for the existing stack: Next.js 14 App Router, TypeScript, Tailwind v4,
ethers v6.

## What's here

```
lib/x402/config.ts                  endpoint catalog, pricing, network config
lib/x402/paywall.ts                 withX402() — the 402 challenge + verification
lib/x402/holder.ts                  $QUORUM holder discount, live balanceOf
lib/x402/usage.ts                   usage tracking + seeded demo dataset
lib/x402/data.ts                    adapters — REPLACE with market_snapshots reads

app/api/catalog/route.ts            machine-readable catalog        (free)
app/.well-known/x402/route.ts       discovery document              (free)
app/api/v1/stats/route.ts           adoption counter                (free)
app/api/v1/news/route.ts            $0.01                           (paid)
app/api/v1/sentiment/[token]/       $0.005                          (paid)
app/api/v1/flags/[token]/           $0.005                          (paid)
app/api/v1/pulse/route.ts           $0.01                           (paid)
app/api/v1/snapshot/route.ts        $0.01                           (paid)

app/(site)/agents/page.tsx          the section
app/(site)/agents/AgentUsageCounter.tsx   live counter (client)
```

Copy `lib/` and `app/` over the repo root. Paths assume the `@/*` alias already
in `tsconfig.json`.

## Install

Nothing new to install — `ethers` and `next` are already dependencies. The
snippet shown on the page references `x402-fetch`, which is the *caller's*
dependency, not yours.

## Environment

```bash
# Payment rails — leave unset to stay in dev preview
X402_MODE=dev-preview            # set to "live" only once a facilitator is wired
X402_PAY_TO=                     # recipient wallet for USDG
X402_ASSET_ADDRESS=              # USDG contract on chain 4663
X402_DEV_KEY=                    # shared secret for the X-Quorum-Dev-Key bypass

# Reused from the existing gate
ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com
QUORUM_TOKEN_ADDRESS=
QUORUM_TOKEN_DECIMALS=18
QUORUM_MIN_BALANCE=50000
```

`X402_LIVE` is true only when `X402_MODE=live` **and** both `X402_PAY_TO` and
`X402_ASSET_ADDRESS` are set. Until then every priced route returns its 402
shape and honours the dev key. It never silently charges and never silently
opens — the same posture as `gate_not_configured` on the reader side.

## Try it

```bash
# discovery — free
curl -s localhost:3000/api/catalog | jq
curl -s localhost:3000/.well-known/x402 | jq

# a paid endpoint with no payment -> 402 + requirements
curl -i localhost:3000/api/v1/sentiment/PGREM

# dev bypass
curl -s -H "X-Quorum-Dev-Key: $X402_DEV_KEY" \
  localhost:3000/api/v1/flags/PGREM | jq

# simulate an agent payment (dev preview only)
PAY=$(printf '{"payload":{"from":"0x7a1f9c4e2b8d05a3f6c1e9b47d2085fa3c6e1b94"}}' | base64 -w0)
curl -s -H "X-PAYMENT: $PAY" localhost:3000/api/v1/sentiment/PGREM | jq

# adoption counter — free
curl -s localhost:3000/api/v1/stats | jq
```

## About the demo counter

`lib/x402/usage.ts` ships a **seeded demo dataset**: 39 calls from 7 agent
wallets across the last ~26 hours, $0.275 USDG. Every response that touches it
is stamped `"mode": "demo"` and carries a `disclaimer` field, and the `/agents`
page renders an amber **DEMO DATA** badge.

On the first real settled call, `mode` flips to `"live"` and the seed rows are
excluded from every figure — automatically, with no code change.

This is deliberate. Quorum's entire pitch is *check our numbers*. A developer
who calls `/api/v1/stats`, sees a round number that never moves, and works out
it's fabricated does more damage than an empty counter ever would. Labelled, the
same number demonstrates the product; unlabelled, it discredits it.

To go live with real numbers, promote the store to Postgres — the Prisma model
is in a comment at the bottom of `usage.ts`.

## Before flipping to live

1. Wire a facilitator (`verify` + `settle`). `verifyPayment()` in `paywall.ts`
   deliberately **refuses** in live mode until you do.
2. Replace `lib/x402/data.ts` with reads from `market_snapshots`.
3. Move usage tracking to Prisma.
4. Decide the refund path for a settled payment that produced a 4xx (marked
   `TODO` in `paywall.ts`; currently such a call is simply not billed or
   counted).
5. Rate-limit per payer address.
