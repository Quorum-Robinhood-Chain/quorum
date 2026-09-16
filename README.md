# Quorum

News and market-data site for the **Robinhood Chain** ecosystem (Ethereum L2, chain ID 4663).
Curated third-party reporting + live on-chain/market data, written up automatically on an
hourly cycle and held behind an editorial review gate.

Built from `dev-brief.md`. Next.js 14 (App Router) · TypeScript · Tailwind v4 · Prisma/Postgres · MiMo.

---

## What changed in this rebuild

Three bugs were making tokens look "unreadable". All three are fixed:

| # | Symptom | Cause | Fix |
|---|---------|-------|-----|
| 1 | Every MiMo call returned 401 | The API key was sent as an `api-key` header. MiMo is OpenAI-compatible and only accepts `Authorization: Bearer <key>`. | `lib/llm/client.ts` |
| 2 | Admin login redirected straight back to `/admin/login` | `ADMIN_SESSION_SECRET` had a silent fallback. The Edge middleware and the Node route handlers could end up signing with different values, so no cookie ever verified. | `lib/auth/session.ts` — required in production |
| 3 | Valid-looking values rejected | `.env` saved with CRLF leaves a trailing `\r` glued to unquoted values, which corrupts any header built from them. | `lib/env.ts` sanitises every read |

### The /tokens page showed nothing

Separate from the three above, the Tokens board came up empty. Three causes:

- **`price_change_24h` was never written by anything.** The presenter read that metric, but
  no data source produced it, so the change column was permanently `—`. `coingecko.ts`
  existed but was never called from the refresh job. It is now wired in, and it is the only
  source that supplies a 24h change.
- **No source worked without on-chain config.** Prices came only from `TOKEN_POOL_MAP`
  (pool addresses) and `STOCK_TOKEN_MAP` (contract addresses) — neither of which can be
  filled in until Robinhood Chain deployments are confirmed. Tokens now carry a
  `coingeckoId`, so anything CoinGecko lists is priced immediately with no config at all.
  An on-chain pool, once mapped, overrides the CoinGecko price for that token.
- **A table of dashes instead of a fallback.** With tokens seeded but no snapshots, the
  presenter returned six "live" rows where every column read `—`, while also showing the
  "sample data" badge. It now falls back to the sample set when nothing is priced, drops
  individual tokens that have no numbers, and sorts by 24h volume — the board is a
  *trending* view (§6.2), not a dump in insert order.

`lib/env.ts` also reads variables **lazily**. Reading `process.env.X` at module top level gets
evaluated during `next build`, so on Vercel a variable added after the build came back
`undefined` at runtime.

The LLM provider was switched from Anthropic to **MiMo (Xiaomi)** throughout.

---

## Quick start

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and MIMO_API_KEY at minimum
npm run db:migrate            # creates the schema
npm run db:seed               # sources, tracked tokens, admin editor
npm run dev
```

Admin dashboard: <http://localhost:3000/admin> (credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

### Check your config is actually being read

```bash
curl http://localhost:3000/api/health
# → which variables are present (never their values)

curl -H "x-cron-secret: $CRON_TRIGGER_SECRET" "http://localhost:3000/api/health?deep=1"
# → also pings MiMo and the database
```

If `checks.mimo.ok` is `false`, the error message tells you whether it's the key, the base
URL, or the model name.

---

## Deploying to Vercel

### 1. Prepare a database first

Vercel has no database of its own. Create one before deploying — Supabase and Neon both
have a free tier and give you two connection strings:

- `DATABASE_URL` → the **pooled** string (Supabase: "Transaction" mode, port 6543).
  Serverless functions open a connection per invocation and exhaust a direct connection fast.
- `DIRECT_URL` → the **direct/session** string (port 5432). Migrations can't run through
  pgbouncer, so Prisma needs this separately.

### 2. Push the repo

```bash
git init && git add . && git commit -m "Quorum"
git remote add origin git@github.com:you/quorum.git
git push -u origin main
```

`.env` is gitignored. Never commit it.

### 3. Import in Vercel

New Project → import the repo. Framework preset detects Next.js; leave the build and output
settings alone. **Don't deploy yet.**

### 4. Add environment variables before the first build

Settings → Environment Variables. Add every key from `.env.example` for Production (and
Preview, if you want previews to work). Two are non-negotiable:

- `ADMIN_SESSION_SECRET` — must exist **at build time**. The Edge middleware and the Node
  route handlers both sign with it; if it's missing the build fails loudly rather than
  shipping an admin area nobody can log into. Generate with `openssl rand -hex 32`.
- `MIMO_API_KEY` — plus `MIMO_BASE_URL` if you're on a Token Plan key (`tp-…`), which uses
  a dedicated regional host rather than the default.

Then deploy. `npm run build` runs `prisma generate && next build`, so a cached
`node_modules` can't leave you with a stale client.

### 5. Run the migration and seed once

From your machine, pointed at the production database:

```bash
npx prisma migrate deploy   # creates the schema
npx prisma db seed          # sources, tracked tokens, admin editor
```

### 6. Verify

```bash
curl https://your-app.vercel.app/api/health
```

Every key should read `true`. Then fill the Tokens page:

```bash
curl -H "x-cron-secret: $CRON_TRIGGER_SECRET" https://your-app.vercel.app/api/cron/market
```

Reload `/tokens` — priced tokens appear, sorted by 24h volume. If it still shows the sample
badge, the response from that call lists exactly which provider failed and why.

### 7. Scheduled jobs

`vercel.json` registers four crons:

| Schedule | Path | Job |
|---|---|---|
| every 5 min | `/api/cron/market` | refresh market/on-chain snapshots |
| every 20 min | `/api/cron/ingest` | poll news feeds, filter for relevance |
| hourly | `/api/cron/generate` | generate one draft from the template rotation |
| Fridays 09:00 | `/api/cron/weekly-digest` | weekly rollup |

Add `CRON_SECRET` in Vercel — Cron sends it as `Authorization: Bearer …` automatically.

The Hobby plan only runs **daily** crons, and caps functions at 10s (too short for
generation). Either upgrade to Pro, or point an external scheduler (GitHub Actions,
cron-job.org) at the same URLs using the `x-cron-secret` header.

### Day-to-day workflow

- `main` → production. Every other branch gets a preview deployment automatically.
- Schema change: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name what_changed`
  locally, commit the generated migration folder, push. Run `npx prisma migrate deploy`
  against production after the deploy lands.
- Preview deployments share whatever `DATABASE_URL` you set for the Preview environment —
  point it at a separate branch database if you don't want previews writing to production.

## How it works

```
[RSS ingest] ──► raw_items ─┐
                            ├─► [MiMo writer] ──► articles(draft) ──► [review] ──► published
[market refresh] ─► market_snapshots ─┘                                              │
                            └──────────────────────────────────────► ticker / sidebar / pages
```

- **Numbers never come from article text.** Anything presented as a figure is read from a
  market snapshot row, and the generator passes only those values to the model as
  `VERIFIED DATA` (§6.1 rule 2).
- **Not enough data means no article.** `generateArticle()` returns `skipped` and writes
  nothing rather than letting the model approximate. Expect this for the first few cycles.
- **Every draft keeps its inputs.** `generationInputs[]` records which snapshots and
  snippets produced it, for review and debugging (§12).
- **Graceful degradation.** If the DB or a data provider is unreachable, presenters fall
  back to the sample set in `data/` and the UI says so — stale data is never shown as live.

### Project layout

```
app/
  (site)/            public pages — home, markets, tokens, ecosystem, news, learn
  (admin)/admin/     review queue (own root layout, no site chrome)
  api/
    cron/[job]/      scheduled entry point (Vercel Cron or external scheduler)
    admin/           login/logout, review queue, manual job trigger
    health/          config + connectivity diagnostics
lib/
  env.ts             every env read goes through here
  auth/              admin session (Edge-safe HMAC cookie) + cron authorisation
  llm/               MiMo client, system prompt, generation pipeline
  market/            DefiLlama, Morpho, stock tokens, on-chain pools, refresh job
  sources/           RSS ingestion
  presenters/        DB → view models, with sample-data fallbacks
data/                sample content used only when nothing is live yet
```

---

## Editorial rules baked into the code

From brief §6.1, §13 and §16 — enforced in `lib/llm/prompts.ts`:

- Summarise in original wording, attribute, link out. Never republish.
- Every stated number must come from the verified data block.
- No invented quotes, no buy/sell advice, no price predictions.
- Automated articles carry a visible badge; "Not financial advice" appears site-wide.
- Robinhood Chain has **no** native governance token, no staking APY and no "RHC" coin —
  the prompt forbids implying otherwise, even for dramatic effect.

## Open items before launch

- Confirm BeInCrypto and Coinfomania offer official feeds, and check their robots.txt/ToS.
  Leave a feed URL blank and that source is skipped — there is deliberately no scraper.
- Confirm the DefiLlama chain slug, the Morpho USDG market id, and the Stock Token
  contract addresses once Robinhood Chain is listed and documented.
- Trademark check on the "Quorum" name (ConsenSys already ships an enterprise chain by
  that name, though the markets don't overlap).
