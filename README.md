# Quorum

News and market-data site for the **Robinhood Chain** ecosystem (Ethereum L2, chain ID 4663).
Curated third-party reporting + Dexscreener market-sentiment data + live on-chain/market data,
written up automatically every 30 minutes and **auto-published immediately** — no manual
approval step. Stories stay **holder-only for their first hour**: reading one within that
window requires a connected wallet holding at least 50,000 **$QUORUM**, Quorum's own access
token (unrelated to any Robinhood Chain asset). After an hour, every story is free for
everyone.

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

`vercel.json` pins Function region to `syd1` (Sydney) — set this to wherever your
Postgres provider actually lives (check its dashboard) so functions don't round-trip
to the database across the ocean on every request. Hobby plans can set a single
region here same as Pro; only automatic multi-region failover is Enterprise-only.

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

Quorum is on Hobby, which only allows crons that run **once a day** and caps every
function invocation at **10s** — so `vercel.json` no longer registers any crons, and
`.github/workflows/cron.yml` runs the four jobs on their original cadence, split by
how each one behaves:

| Schedule | How it runs | Job |
|---|---|---|
| every 5 min | curl → `/api/cron/market` | refresh market/on-chain snapshots |
| every 20 min | curl → `/api/cron/ingest` | poll news feeds, filter for relevance |
| every 30 min | **directly on the runner** (`scripts/run-job.ts`) | generate one draft, auto-published immediately |
| Fridays 09:00 UTC | **directly on the runner** (`scripts/run-job.ts`) | weekly rollup |

`ingest` and `market` still go through the Vercel route — both are quick and stay
comfortably under the 10s limit. `generate` and `weekly-digest` call the MiMo LLM API
for up to ~1200 tokens, which routinely runs past 10s, so those two import `lib/jobs.ts`
and run straight on the GitHub Actions runner instead — no function timeout to work
around there at all (default job limit is 6h).

Set these repo secrets in GitHub (Settings → Secrets and variables → Actions):

- `SITE_URL` — your deployed URL, no trailing slash (e.g. `https://quorum.example.com`) — used by `ingest`/`market`
- `CRON_TRIGGER_SECRET` — same value as the env var in Vercel — used by `ingest`/`market`
- `DATABASE_URL`, `DIRECT_URL` — same pooled connection strings as Vercel — used by `generate`/`weekly-digest`
- `MIMO_API_KEY`, `MIMO_BASE_URL`, `MIMO_MODEL` — same values as Vercel — used by `generate`/`weekly-digest`
- `RHC_RPC_URL` — same value as Vercel (the `new_token_launches` template reads new pairs from chain RPC) — used by `generate`/`weekly-digest`

`CRON_SECRET` (the Vercel-Cron-only secret) can stay blank since Vercel Cron isn't in use.

**Actions minutes on a private repo:** the free tier gives 2,000 min/month. `generate`
running ~48x/day is the main consumer — the workflow caches npm dependencies to keep
each run short. If usage ever gets close to the limit, drop `generate` to hourly, or
make the repo public (unlimited Actions minutes; `.env` is already gitignored, so
nothing secret would be exposed).

You can also run any job locally the same way the runner does:

```bash
npm run job generate
```

Trigger any job manually from the Actions tab → "Quorum scheduled jobs" → **Run workflow**
(pick a job from the dropdown), or with curl the same way:

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
                                  ├─► [MiMo writer] ──► articles(published, gated 1hr) ──► ticker / sidebar / pages
[market refresh] ─► market_snapshots ─┘                                                       │
                                                            [wallet connect + $QUORUM balance] ─┘
                                                            (only checked while an article is < 1hr old)
```

- **Auto-publish, not review-gated.** A generated draft is live the instant `generateArticle()`
  writes it — `status: 'published'`, `publishedAt: now`. There's no approval step in the path.
- **The safety net is a flag, not a gate.** Cheap heuristics (`autoFlagReason()` in
  `lib/llm/generate.ts`: thin data coverage, a too-short body, a missing dek) set `flagged: true`
  on the same row. Flagged stories stay live and float to the top of `/admin` for a quick look;
  `Unpublish` there is a one-click, reversible emergency takedown for anything that needs it.
- **Numbers never come from article text.** Anything presented as a figure is read from a
  market snapshot row, and the generator passes only those values to the model as
  `VERIFIED DATA` (§6.1 rule 2).
- **Not enough data means no article.** `generateArticle()` returns `skipped` and writes
  nothing rather than letting the model approximate. Expect this for the first few cycles.
- **Every draft keeps its inputs.** `generationInputs[]` records which snapshots and
  snippets produced it, for review and debugging (§12).
- **Graceful degradation.** If the DB or a data provider is unreachable, presenters fall
  back to the sample set in `data/` and the UI says so — stale data is never shown as live.

### Two kinds of "news"

- **From outside** (`lib/sources/ingest.ts`) — RSS from BeInCrypto/Coinfomania. It is never
  shown to readers as-is: it lands in `raw_items` as raw material, and only
  `ecosystem_roundup` turns it into an original Quorum article — see editorial rule 1,
  "attribute, don't republish."
- **Made by Quorum** — everything the `generate` cron produces every 30 minutes, across
  all seven templates (`lib/llm/prompts.ts` → `TEMPLATE_LABELS`), auto-published
  immediately and gated for the first hour (see "Wallet + $QUORUM gating" below).

### Market sentiment (Dexscreener, replaces X/Apify)

- **X/Twitter ingestion was removed.** Apify is paid and the Quorum pipeline no longer
  touches X. `lib/sources/apify-ingest.ts` and every `APIFY_*` variable are gone.
- **`market_pulse` template** (was `social_pulse`). `lib/market/pulse.ts` looks up the
  most liquid Dexscreener pair for the busiest tracked `trending`/`defi` tokens and reads
  24h price change, volume, liquidity and buy/sell transaction counts.
- **Tone is computed in code, not by the model.** Each token gets a `tone` from its price
  move (beyond +/-5%) and buy share (above 55% / below 45%); the whole market gets
  `risk-on` / `mixed` / `risk-off`. The LLM only writes around those labels.
- **"Search on X" links:** under each `market_pulse` article, the source list adds a plain
  `x.com/search` link for each of the top 5 tokens, labelled "link only, not Quorum
  analysis". Quorum does not fetch, read or summarize anything from X — the links are
  just a shortcut for readers (`xSearchUrl()` in `lib/market/pulse.ts`).
- **Score and warnings:** each token also gets a 0-100 `sentimentScore` (50 = neutral,
  from price change + buy share), and the market gets an average score plus a
  `bullBearRatio`. `warnings` flag thin liquidity, volume >10x liquidity and one-sided
  buy/sell flow — indicators only, never proof of wash trading.
- **"Sentiment" means measured behavior only** — editorial rule 6 forbids the model from
  claiming to know what any social account or community is saying.
- **Quota:** if none of the last 3 articles was a `market_pulse`, the next `generate` cycle
  is forced to be one (`applyPulseQuota()` in `lib/llm/generate.ts`). If Dexscreener has
  fewer than 3 tokens with data that cycle, it falls back to the normal random topic
  instead of skipping.
- No API key required.

### Wallet + $QUORUM gating

- **Window, not a flag on the row.** Gating is derived from `publishedAt` at request time
  (`lib/gating.ts`, default 60 min via `GATE_WINDOW_MINUTES`) — nothing needs to run to "release"
  an article, it just ages out.
- **The body never reaches the client while gated.** `getArticleById()` (`lib/presenters/articles.ts`)
  returns `body: ''` for a gated article; the real text only comes back from
  `getGatedArticleBody()`, called server-side by `GET /api/articles/[id]?address=0x…` after
  re-checking both the age and the on-chain balance. The article detail page renders the gated
  case through `components/GatedArticleBody.tsx`, a client component that connects a wallet
  (`lib/wallet/WalletProvider.tsx`, EIP-6963) and calls that same endpoint.
- **Balance check is a plain ERC-20 read.** `lib/wallet/quorumToken.ts` calls `balanceOf` on
  `QUORUM_TOKEN_ADDRESS` via `QUORUM_TOKEN_RPC_URL` (falls back to `RHC_RPC_URL`). $QUORUM isn't
  deployed yet — see **Open items** — so until `QUORUM_TOKEN_ADDRESS` is set the gate reports
  `gate_not_configured` rather than silently failing open or closed.
- **Threshold is config, not code.** `QUORUM_MIN_BALANCE` (default `50000`) and
  `QUORUM_TOKEN_DECIMALS` are both env vars — change the minimum without a redeploy of the logic.

### Project layout

```
app/
  (site)/            public pages — home, markets, tokens, ecosystem, news, learn
  (admin)/admin/     moderation queue — flag/unpublish/edit, own root layout, no site chrome
  api/
    cron/[job]/      scheduled entry point (GitHub Actions — .github/workflows/cron.yml)
    admin/           login/logout, moderation actions, manual job trigger
    health/          config + connectivity diagnostics
lib/
  env.ts             every env read goes through here
  gating.ts          1-hour gate window (publishedAt age check)
  auth/              admin session (Edge-safe HMAC cookie) + cron authorisation
  llm/               MiMo client, system prompt, generation pipeline
  market/            DefiLlama, Morpho, stock tokens, on-chain pools, refresh job
  sources/           RSS ingestion (ingest.ts) + market pulse (market/pulse.ts)
  wallet/            EIP-6963 connect (client) + $QUORUM balanceOf check (server)
  presenters/        DB → view models, with sample-data fallbacks
data/                sample content used only when nothing is live yet
```

---

## Editorial rules baked into the code

From brief §6.1, §13 and §16 — enforced in `lib/llm/prompts.ts`:

- Summarise in original wording, attribute, link out. Never republish.
- Every stated number must come from the verified data block.
- No invented quotes, no buy/sell advice, no price predictions.
- Posts from monitored X accounts are sentiment, not fact — paraphrased and attributed by
  handle, never treated as confirmation of anything unless it's also in verified data.
- Automated articles carry a visible badge; "Not financial advice" appears site-wide.
- Robinhood Chain has **no** native governance token, no staking APY and no "RHC" coin —
  the prompt forbids implying otherwise, even for dramatic effect.
- $QUORUM is Quorum's own access-gating token, unrelated to Robinhood Chain governance —
  the model may only name it when the template is explicitly about it, and may never state
  or imply a $QUORUM price, price target, or price movement.

## Open items before launch

- Confirm BeInCrypto and Coinfomania offer official feeds, and check their robots.txt/ToS.
  Leave a feed URL blank and that source is skipped — there is deliberately no scraper.
- Confirm the DefiLlama chain slug, the Morpho USDG market id, and the Stock Token
  contract addresses once Robinhood Chain is listed and documented.
- **$QUORUM isn't deployed yet.** `QUORUM_TOKEN_ADDRESS` is a placeholder env var — set it
  (and `QUORUM_TOKEN_RPC_URL` if the token ends up on a different chain than Robinhood Chain)
  once the contract exists. Until then the gate reports `gate_not_configured` instead of
  pretending to work.
- Trademark check on the "Quorum" name (ConsenSys already ships an enterprise chain by
  that name, though the markets don't overlap).
