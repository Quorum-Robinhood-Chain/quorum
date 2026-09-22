<div align="center">

<img src="./public/logo.png" width="130" height="130" alt="Quorum Logo" />

# QUORUM

**Automated News & Market-Data Intelligence for the Robinhood Chain Ecosystem**

*Curated reporting. Live market data. Written every 30 minutes, published instantly.*

**Contract Address ($QUORUM):** `0xd78e5420d683ec8f2bfb04eed2cf06326f6ec732`

[![Framework](https://img.shields.io/badge/Framework-Next.js%2014%20(App%20Router)-000000?style=flat-square&logo=nextdotjs&logoColor=white&labelColor=0D0D0A)](#-tech-stack)
[![Network](https://img.shields.io/badge/Network-Robinhood%20Chain%20·%204663-1A9E4B?style=flat-square&labelColor=0D0D0A)](#-how-it-works)
[![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0D0D0A)](#-tech-stack)
[![Database](https://img.shields.io/badge/Database-Postgres%20·%20Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white&labelColor=0D0D0A)](#-tech-stack)
[![LLM](https://img.shields.io/badge/LLM-MiMo%20(Xiaomi)-FF6900?style=flat-square&labelColor=0D0D0A)](#-how-it-works)
[![Gating](https://img.shields.io/badge/Access-Wallet%20%2B%20%24QUORUM%20Gated-CCFF00?style=flat-square&logoColor=0D0D0A&labelColor=0D0D0A)](#wallet--quorum-gating)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20v4%20·%20Framer%20Motion-38C172?style=flat-square&labelColor=0D0D0A)](#-tech-stack)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel&logoColor=white&labelColor=0D0D0A)](#-deploying-to-vercel)
[![License](https://img.shields.io/badge/License-Unspecified-lightgrey?style=flat-square&labelColor=0D0D0A)](#-license--disclaimer)

</div>

---

**Quorum** is a news and market-data site for the **Robinhood Chain** ecosystem (Ethereum L2, chain ID `4663`). It combines curated third-party reporting, Dexscreener market-sentiment data, and live on-chain/market data into original articles — written up automatically every 30 minutes by an LLM pipeline and **auto-published immediately**, with no manual approval step. Fresh stories are **holder-only for their first hour**, unlocked by connecting a wallet holding at least 50,000 **$QUORUM**, Quorum's own access token. After an hour, every story is free for everyone.

Built from `dev-brief.md`. Next.js 14 (App Router) · TypeScript · Tailwind v4 · Prisma/Postgres · MiMo.

---

## 🏛️ Core Value Proposition

Fast-moving chains like Robinhood Chain generate more market activity than any human editorial team can keep up with, and existing coverage is either stale, manual, or disconnected from what's actually happening on-chain:

* **The Staleness Problem:** By the time a human writes up a market move, the move is already old news.
* **The Numbers-From-Nowhere Problem:** Many "market" articles quote figures the writer never verified against a live source.
* **The All-or-Nothing Access Problem:** Sites are either fully paywalled (killing reach) or fully free (no incentive to hold the ecosystem's own token).

Quorum addresses this with a single automated pipeline:

* **Verified-Data-Only Generation:** The model is only allowed to state numbers that were pulled from a live market snapshot — never invented, never estimated.
* **Auto-Publish With a Safety Net:** Every generated draft goes live immediately; cheap heuristics flag (not block) thin or low-confidence drafts for a quick human look.
* **Time-Boxed Token Gating:** Stories are free after one hour — the token gates freshness, not access to information itself.
* **Attribution, Never Republishing:** Third-party reporting is summarized and linked out in original wording, never lifted verbatim.

---

## 🔍 What Powers Every Article

Each `generate` cycle draws on parallel data pipelines before the model ever writes a word:

| Module | Source | What It Feeds |
|---|---|---|
| **1. News Ingest** | RSS (BeInCrypto, Coinfomania) via `lib/sources/ingest.ts` | Raw material for the `ecosystem_roundup` template — never shown to readers as-is. |
| **2. Market Pulse** | Dexscreener public API via `lib/market/pulse.ts` | 24h price change, volume, liquidity, buy/sell counts for the busiest tracked tokens. |
| **3. On-Chain / Protocol Data** | DefiLlama, Morpho API, Chain RPC, on-chain pools | TVL, APY, active protocols, gas, tx count — recorded as `MarketSnapshot` rows. |
| **4. Trending Token Discovery** | Dexscreener, filtered by minimum pair liquidity | Auto-discovered trending/meme tokens for the Tokens board. |
| **5. Wallet + $QUORUM Balance** | On-chain `balanceOf` read via `lib/wallet/quorumToken.ts` | Gates access to any article still inside its first-hour window. |

---

## 🔑 Editorial & Generation Rules

Baked into `lib/llm/prompts.ts` from `dev-brief.md` §6.1, §13 and §16:

> **Rule:** Every stated number must come from a verified `MarketSnapshot` row, passed to the model as `VERIFIED DATA`. If there isn't enough data, `generateArticle()` returns `skipped` and writes nothing.

- Summarize in original wording, attribute, link out — never republish.
- No invented quotes, no buy/sell advice, no price predictions.
- Monitored social posts are treated as sentiment, not fact, and are always attributed by handle.
- Automated articles carry a visible badge; "Not financial advice" appears site-wide.
- Robinhood Chain has **no** native governance token, no staking APY, and no "RHC" coin — the prompt forbids implying otherwise.
- **$QUORUM** is Quorum's own access-gating token, unrelated to Robinhood Chain governance, and the model may never state or imply a $QUORUM price or price movement.

### Auto-publish, with a flag instead of a gate

```
Draft: 30-minute cycle ──► generateArticle() ──► status: published, publishedAt: now
                                    │
                                    └─► autoFlagReason() heuristics (thin data,
                                         short body, missing dek) ──► flagged: true
                                                                          │
                                                            floats to top of /admin
                                                            for a one-click Unpublish
```

There is no approval step in the path — the safety net is a flag on the row, not a gate in front of it.

---

## 🖥️ How It Works

```
[RSS ingest] ──► raw_items ─┐
                                  ├─► [MiMo writer] ──► articles(published, gated 1hr) ──► ticker / sidebar / pages
[market refresh] ─► market_snapshots ─┘                                                       │
                                                            [wallet connect + $QUORUM balance] ─┘
                                                            (only checked while an article is < 1hr old)
```

* **Numbers never come from article text.** Anything presented as a figure is read from a market snapshot row.
* **Graceful degradation.** If the database or a data provider is unreachable, presenters fall back to the sample set in `data/` and the UI says so — stale data is never shown as live.
* **Every draft keeps its inputs.** `generationInputs[]` records which snapshots and snippets produced each article, for review and debugging.

### Wallet + $QUORUM gating

- **Window, not a flag on the row.** Gating is derived from `publishedAt` at request time (`lib/gating.ts`, default 60 minutes via `GATE_WINDOW_MINUTES`) — nothing needs to run to "release" an article, it just ages out.
- **The body never reaches the client while gated.** `getArticleById()` returns `body: ''` for a gated article; the real text is only returned by `getGatedArticleBody()`, called server-side after re-checking both age and on-chain balance.
- **Balance check is a plain ERC-20 read.** `lib/wallet/quorumToken.ts` calls `balanceOf` on `QUORUM_TOKEN_ADDRESS`. Since $QUORUM isn't deployed yet, the gate reports `gate_not_configured` rather than failing open or closed silently.
- **Contract address.** $QUORUM's on-chain contract address is `0xd78e5420d683ec8f2bfb04eed2cf06326f6ec732`. This is the address `QUORUM_TOKEN_ADDRESS` should point to for `balanceOf` reads.
- **Threshold is config, not code.** `QUORUM_MIN_BALANCE` (default `50000`) and `QUORUM_TOKEN_DECIMALS` are env vars, changeable without a redeploy of the logic.

---

## 🏗️ Project Layout

```
app/
  (site)/            public pages — home, markets, tokens, ecosystem, news, learn
  (admin)/admin/     moderation queue — flag/unpublish/edit, own root layout, no site chrome
  api/
    cron/[job]/      scheduled entry point (GitHub Actions — .github/workflows/cron.yml)
    admin/           login/logout, moderation actions, manual job trigger
    health/          config + connectivity diagnostics
lib/
  env.ts             every env read goes through here (lazy, CRLF-sanitised)
  gating.ts          1-hour gate window (publishedAt age check)
  auth/              admin session (Edge-safe HMAC cookie) + cron authorisation
  llm/               MiMo client, system prompt, generation pipeline
  market/            DefiLlama, Morpho, stock tokens, on-chain pools, refresh job
  sources/           RSS ingestion (ingest.ts) + market pulse (market/pulse.ts)
  wallet/            EIP-6963 connect (client) + $QUORUM balanceOf check (server)
  presenters/        DB → view models, with sample-data fallbacks
components/          site chrome, ticker, hero, token/market/news sections, wallet modal
prisma/              schema, migrations, seed script
data/                sample content used only when nothing is live yet
scripts/run-job.ts   CLI entry for running any scheduled job locally
public/              logo, favicon, category imagery
```

---

## 💻 Tech Stack

### Frontend & UI
- **Framework:** Next.js 14 (App Router) with TypeScript, React 18.
- **Styling:** Tailwind CSS v4.
- **Motion:** Framer Motion for interactive transitions and reveals.
- **Icons:** Lucide React.

### Backend & Data
- **Database:** PostgreSQL via Prisma ORM (pooled `DATABASE_URL` for runtime, direct `DIRECT_URL` for migrations).
- **LLM Provider:** MiMo (Xiaomi), OpenAI-compatible API, called via `lib/llm/client.ts` with `Authorization: Bearer`.
- **Web3 / RPC:** Ethers.js v6 for wallet connection and token balance reads.
- **Market Data:** Dexscreener public API (no key required), DefiLlama, Morpho API.
- **News Ingest:** `rss-parser` against RSS feeds (BeInCrypto, Coinfomania).
- **Hosting / Compute:** Vercel, pinned to a single function region in `vercel.json`.
- **Scheduling:** GitHub Actions (`.github/workflows/cron.yml`) drives the recurring jobs, since Hobby-plan Vercel crons are limited to once a day.

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js:** v20 or higher
- **PostgreSQL** database (Supabase, Neon, or any Postgres provider)
- **MiMo API key** for article generation

### Quick Start

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and MIMO_API_KEY at minimum
npm run db:migrate            # creates the schema
npm run db:seed               # sources, tracked tokens, admin editor
npm run dev
```

Admin dashboard: `http://localhost:3000/admin` (credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

### Check your config is actually being read

```bash
curl http://localhost:3000/api/health
# → which variables are present (never their values)

curl -H "x-cron-secret: $CRON_TRIGGER_SECRET" "http://localhost:3000/api/health?deep=1"
# → also pings MiMo and the database
```

If `checks.mimo.ok` is `false`, the response explains whether it's the key, the base URL, or the model name.

### Run any job locally

```bash
npm run job generate     # or: ingest, market, trending
```

---

## 🚀 Deploying to Vercel

1. **Prepare a database first** — Vercel has none of its own. Supabase or Neon both work; grab both the pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings.
2. **Push the repo** and import it in Vercel — the Next.js preset is detected automatically.
3. **Set every key from `.env.example`** as an environment variable before the first build. `ADMIN_SESSION_SECRET` and `MIMO_API_KEY` are non-negotiable — the build fails loudly if `ADMIN_SESSION_SECRET` is missing rather than shipping an admin area nobody can log into.
4. **Run the migration and seed once** against production:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. **Verify:**
   ```bash
   curl https://your-app.vercel.app/api/health
   curl -H "x-cron-secret: $CRON_TRIGGER_SECRET" https://your-app.vercel.app/api/cron/market
   ```
6. **Scheduled jobs run via GitHub Actions**, not Vercel cron — see `.github/workflows/cron.yml` for cadence per job.

---

## 📄 License & Disclaimer

### Disclaimer
**Not financial advice.** Articles are generated automatically from verified market data and third-party reporting. Token prices, liquidity, and on-chain conditions can change at any time after publication. Always perform independent verification before acting on anything read here.

### License
No license file is currently included in this repository — add one before distributing or open-sourcing the project.

---

<div align="center">
Built for the <b>Robinhood Chain</b> Ecosystem
</div>