# Quorum Backend — Setup & Operations

This adds a full backend to the existing Next.js frontend: a Postgres database (Prisma),
a news-ingestion + market-data + LLM generation pipeline, and a BullMQ/Redis scheduler.
Everything lives inside this same Next.js project — API routes under `app/api/`, and two
standalone worker scripts under `workers/` that run alongside `next dev`/`next start`.

## 1. Install

```bash
npm install
```

## 2. Set up the database (Supabase or Neon)

1. Create a Postgres project on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — the **pooled** connection string (Supabase: "Transaction" mode; Neon: the
     default pooled branch string).
   - `DIRECT_URL` — the **unpooled/direct** connection string (Supabase: "Session" mode; Neon:
     the direct connection). Prisma needs this for migrations — the pooler doesn't support them.
3. Generate the client and run the first migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

`db:seed` creates the two `Source` rows (BeInCrypto, Coinfomania — disabled until you confirm
their feed URLs, see §4 below), six starter `Token` rows, and an `Editor` row matching
`ADMIN_USERNAME`.

> **Note on this sandbox:** `prisma generate` couldn't be verified from inside the environment
> I built this in — it needs to download engine binaries from `binaries.prisma.sh`, which
> wasn't reachable from my sandboxed network. Run `npx prisma generate` yourself the first time;
> if it fails to reach that host, check your own network/proxy settings. Everything else here
> was written and reviewed carefully, but treat this as **not yet run end-to-end** and test it
> in your environment before relying on it.

## 3. Set up Redis (BullMQ)

Any managed Redis works — [Upstash](https://upstash.com) (free tier, use the `rediss://` TLS
URL), Redis Cloud, or a local `docker run -p 6379:6379 redis`. Set `REDIS_URL` in `.env`.

## 4. Fill in the remaining env vars

Open `.env.example` for the full list with inline explanations. The ones that need real
research/confirmation before you flip them on (flagged inline in the file too):

| Variable | Why it needs confirming |
|---|---|
| `BEINCRYPTO_FEED_URL`, `COINFOMANIA_FEED_URL` | I could not confirm either site has an official RSS feed at the guessed URL — check manually, and check robots.txt/ToS before enabling (brief §7.1, §17). |
| `DEFILLAMA_CHAIN_SLUG` | Placeholder `"robinhood-chain"` — confirm the exact slug DefiLlama uses once the chain is listed. |
| `RHC_RPC_URL`, `RHC_CHAIN_ID` | Robinhood Chain's public RPC endpoint. |
| `CHAINLINK_FEED_MAP` | Per-symbol Chainlink aggregator contract addresses on Robinhood Chain — not guessable, get from Chainlink's own feed directory once live. |
| `MORPHO_USDG_MARKET_ID` | Morpho market id is per-chain — get it from Morpho's app/docs for the Robinhood Chain USDG market. |
| `UNISWAP_SUBGRAPH_URL`, `ARCUS_SUBGRAPH_URL`, `ONEINCH_API_URL`, `LIGHTER_API_URL` | Each DEX's actual indexer/API endpoint on Robinhood Chain — confirm with each project. |
| `DEX_FACTORY_MAP` | JSON map of `{"uniswap": "0x...factory"}` etc., for the new-token-launch detector in `lib/services/market/chainRpc.ts`. |

Anything left blank is handled gracefully — that data source is simply skipped (logged, not
faked) until you fill it in. See "Ingestion compliance" below for the two news sources
specifically.

## 5. Run it

```bash
npm run dev        # the Next.js app itself (frontend + API routes)
```

There's no separate worker/scheduler process anymore — `POST /api/admin/trigger` runs each
job **synchronously inside the request** (ingest, market-data refresh, article generation) and
returns the result directly. That makes this deployable as-is on Vercel (or any serverless host):
there's nothing that needs to stay running in the background.

To generate one article immediately without waiting for the hourly job (useful for testing,
or for an out-of-cycle/breaking-news post per brief §6.3):

```bash
curl -X POST http://localhost:3000/api/admin/trigger \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_TRIGGER_SECRET" \
  -d '{"job":"generate"}'
```
(Or log into `/admin` in the browser first and call it without the header — the session
cookie works too.)

### Scheduling in production

Since there's no persistent worker, the recurring cadence (ingest every 20 min, market-data
every 3 min, hourly generation, weekly digest) has to be driven by something *outside* the app
hitting `/api/admin/trigger` on a schedule with the `x-cron-secret` header — e.g. an external
cron service (cron-job.org, GitHub Actions `schedule:`, etc.) rather than Vercel's own Cron
Jobs, since Vercel's free Hobby plan caps cron at once/day and this needs sub-hourly cadence.
Body per job: `{"job":"refresh-market-data"}`, `{"job":"ingest-beincrypto"}`,
`{"job":"ingest-coinfomania"}`, `{"job":"generate"}`.

## 6. What's wired to live data already

- `TickerBar` and the sidebar's "Network Snapshot" panel now read from the database
  (`lib/presenters/ticker.ts`, `lib/presenters/networkSnapshot.ts`) instead of the static
  files in `data/`, with a visible "SAMPLE DATA" / "DELAYED" badge if there's no live data yet
  or it's gone stale (>10 min old) — matching brief §12's "never show stale data as live".
- `app/api/tokens`, `app/api/ecosystem`, `app/api/articles` are built and ready, but the
  corresponding frontend components (`TokensSection`, `EcosystemGrid`, `NewsList`, etc.) still
  read from `data/*.ts`. Wire them the same way `Sidebar.tsx` was wired: turn the component into
  an `async` server component and call the relevant presenter/API instead of the static import.
- The admin review queue UI (`ReviewQueueTable.tsx`) still holds local React state. Point it at
  `GET /api/admin/review` and `PATCH /api/admin/review/:id` (both already built and auth-guarded)
  to make it real.

## Ingestion compliance (§7.1, §7.3)

Before turning on either news source in the scheduler:
1. Check `https://<site>/robots.txt` for any disallow rules covering the feed path or general
   crawling.
2. Check the site's Terms of Service for automated-access restrictions.
3. Confirm the feed URL is real and current (I could not verify this from my environment).

If no official feed exists, do not swap in a scraper without the same robots.txt/ToS check —
`lib/services/sources/ingest.ts` is written to only consume RSS/Atom feeds on purpose, so that
compliance check stays a deliberate, visible step rather than something a future scraper module
quietly skips.

## Directory map

```
prisma/schema.prisma          data model (§10)
prisma/seed.ts                 seeds sources + tokens + default editor
lib/db/client.ts                Prisma client singleton
lib/utils/relevance.ts          "Robinhood Chain" keyword filter (§8.2)
lib/utils/dedupe.ts             dedupe key for ingested stories
lib/utils/format.ts             DB values -> display strings ($41.6M, +2.3%, "4 minutes ago")
lib/services/sources/*          BeInCrypto / Coinfomania RSS ingestion (§7.1)
lib/services/market/*           DefiLlama, CoinGecko, Chainlink, Morpho, DEX subgraphs, chain RPC (§7.2)
lib/llm/prompts.ts               system prompt + per-template instructions (§6.1, §6.2, §16)
lib/llm/generate.ts              generation pipeline: gather data -> call Mimo -> store draft (§8.4)
lib/presenters/*                 shared read logic used by both API routes and server components
app/api/ticker, /tokens, /ecosystem, /articles      public read APIs
app/api/admin/review, /admin/trigger                 admin-only (session cookie or cron secret) —
                                                       /admin/trigger runs jobs synchronously, no queue
```

## Known gaps / next steps

- DEX subgraph adapters (`lib/services/market/dexSubgraph.ts`) have real request logic but
  placeholder GraphQL query shapes for Arcus/1inch/Lighter — only Uniswap's is a standard,
  known subgraph schema. Confirm each DEX's actual schema before relying on their numbers.
- `active_protocols` and `stock_tokens_listed` counts aren't computed by any job yet — the
  sidebar currently falls back to the static placeholder for just those two stats.
- No admin UI for managing `Source`/`Token` rows yet (add/disable a source, mark a token
  untracked) — do it via `npx prisma studio` for now.
- No retry/backoff tuning on the BullMQ workers beyond BullMQ's defaults — fine for launch
  volume, revisit if a provider's rate limits start causing job failures.
