import type { Metadata } from 'next';
import { AgentUsageCounter } from './AgentUsageCounter';
import { CATALOG, HOLDER_DISCOUNT_MIN, X402_MODE } from '@/lib/x402/config';

export const metadata: Metadata = {
  title: 'Quorum for Autonomous Agents — x402 API for Robinhood Chain',
  description:
    'News, sentiment and risk flags for Robinhood Chain (chain 4663) as structured JSON, paid per call over x402. No API key. No signup.',
};

const SAMPLE_RESPONSE = `{
  "token": "PGREM",
  "score": 2,
  "tone": "bullish",
  "price_usd": 0.0000084,
  "price_change_24h": 2538,
  "buy_share": 0.61,
  "flags": ["thin_liquidity", "vol_to_liq_10x"],
  "liquidity_usd": 42180,
  "volume_24h_usd": 511400,
  "sources": ["dexscreener", "rpc:4663"],
  "as_of": "2026-09-23T03:04:00Z"
}`;

const SNIPPET = `import { wrapFetchWithPayment } from "x402-fetch";

const pay = wrapFetchWithPayment(fetch, signer); // USDG on chain 4663

const res  = await pay("https://www.quorumchain.news/api/v1/sentiment/PGREM");
const data = await res.json();

if (data.flags.includes("vol_to_liq_10x")) skip(data.token);`;

export default function AgentsPage() {
  return (
    <main className="bg-white text-[#0A1A33]">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b-4 border-[#E4002B] bg-[#0A1A33] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="mb-4 inline-block bg-[#E4002B] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
            In development · {X402_MODE === 'live' ? 'Live' : 'Dev preview'}
          </p>
          <h1 className="max-w-3xl text-4xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl">
            Humans get a terminal.
            <br />
            <span className="text-[#E4002B]">So should your agent.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            News, sentiment and risk flags for Robinhood Chain — structured
            JSON, paid per call over x402. No API key. No signup. No
            subscription. Your agent&apos;s wallet is the account.
          </p>

          <div className="mt-8 overflow-x-auto border border-white/15 bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-white/80">
            <span className="text-white/40">$</span> curl
            https://www.quorumchain.news/api/v1/sentiment/PGREM
            <br />
            <span className="text-[#E4002B]">
              HTTP/1.1 402 Payment Required
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/agents/catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#E4002B] px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[#c40025]"
            >
              View the catalog
            </a>
            <a
              href="https://x.com/quorumnewsX"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/25 px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white/10"
            >
              Request a dev key
            </a>
          </div>
        </div>
      </section>

      {/* ── Live counter ─────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <AgentUsageCounter />
      </div>

      {/* ── The problem ──────────────────────────────────────── */}
      <section className="border-t border-black/10 bg-[#F5F6F8]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Agents can already buy prices.
            <br />
            None of them can buy judgment.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Problem title="Price tells you what happened">
              A token is up 400%. Real demand, or a $20K pool cycling the same
              dollars twenty times? A price feed was never built to answer that.
            </Problem>
            <Problem title="Headlines aren't structured">
              An agent can&apos;t parse a paragraph into a trade. It needs
              fields, thresholds and a timestamp — not prose.
            </Problem>
            <Problem title="Context had no price feed">
              Until now. Same verified pipeline that writes the site every 30
              minutes, served to machines per call.
            </Problem>
          </div>
        </div>
      </section>

      {/* ── Endpoints ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading
          eyebrow="Endpoints"
          title="Five calls, priced per use"
        />
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#0A1A33] text-[11px] uppercase tracking-[0.14em] text-[#0A1A33]/60">
                <th className="py-3 pr-4 font-bold">Endpoint</th>
                <th className="py-3 pr-4 font-bold">Returns</th>
                <th className="py-3 pr-4 font-bold">Price</th>
                <th className="py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((e) => (
                <tr key={e.id} className="border-b border-black/10 align-top">
                  <td className="py-4 pr-4 font-mono text-[13px] font-semibold">
                    {e.path}
                    <p className="mt-1 max-w-xs font-sans text-[12px] font-normal leading-snug text-black/55">
                      {e.summary}
                    </p>
                  </td>
                  <td className="py-4 pr-4 font-mono text-[12px] text-black/60">
                    {e.returns.join(', ')}
                  </td>
                  <td className="py-4 pr-4 tabular-nums font-semibold">
                    ${e.price}{' '}
                    <span className="text-[11px] font-normal text-black/45">
                      USDG
                    </span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`whitespace-nowrap rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        X402_MODE === 'live'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {X402_MODE === 'live' ? 'Live' : 'Dev preview'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 border-l-2 border-[#E4002B] pl-4 text-sm leading-relaxed text-black/70">
          <strong>Holder discount:</strong> agents whose paying wallet holds at
          least {Number(HOLDER_DISCOUNT_MIN).toLocaleString()} $QUORUM pay half
          of list price. Verified with a live <code>balanceOf</code> call on
          chain 4663 at settlement — nothing cached, nothing claimed.
        </p>
      </section>

      {/* ── Shape of the data ────────────────────────────────── */}
      <section className="border-y border-black/10 bg-[#0A1A33] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <SectionHeading
            eyebrow="Response"
            title="What your agent actually gets"
            dark
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <pre className="overflow-x-auto border border-white/15 bg-black/40 p-5 font-mono text-[12.5px] leading-relaxed text-white/85">
              {SAMPLE_RESPONSE}
            </pre>
            <div className="space-y-5 text-sm leading-relaxed text-white/70">
              <p>
                Every payload carries{' '}
                <code className="text-white">sources</code> and{' '}
                <code className="text-white">as_of</code>, for the same reason
                our articles do: a number an agent can&apos;t trace is a number
                it can&apos;t act on.
              </p>
              <p>
                <strong className="text-white">The flags are the point.</strong>{' '}
                <code className="text-white">thin_liquidity</code> under $50K.{' '}
                <code className="text-white">vol_to_liq_10x</code> when 24h
                volume exceeds ten times pool depth.{' '}
                <code className="text-white">one_sided_flow</code> at 85% buys
                or sells across 50+ transactions.
              </p>
              <p>
                Published thresholds, not a black box. The same ones we print in
                articles even when they ruin the story.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How payment works ────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading eyebrow="x402" title="How your agent pays" />
        <ol className="mt-8 grid gap-6 sm:grid-cols-4">
          {[
            [
              '01',
              'Request',
              'Your agent GETs the endpoint. No key, no account.',
            ],
            [
              '02',
              '402',
              'Quorum answers 402 with the exact amount and recipient.',
            ],
            ['03', 'Pay', 'Your agent signs a USDG transfer on chain 4663.'],
            [
              '04',
              'Retry',
              'Same request with the payment header. Data returns.',
            ],
          ].map(([n, t, d]) => (
            <li key={n} className="border-t-2 border-[#0A1A33] pt-4">
              <span className="font-mono text-xs font-bold text-[#E4002B]">
                {n}
              </span>
              <h3 className="mt-1 text-base font-bold uppercase tracking-wide">
                {t}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-black/60">{d}</p>
            </li>
          ))}
        </ol>

        <pre className="mt-10 overflow-x-auto border border-black/15 bg-[#F5F6F8] p-5 font-mono text-[12.5px] leading-relaxed">
          {SNIPPET}
        </pre>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="border-t-4 border-[#E4002B] bg-[#0A1A33] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Humans read Quorum every 30 minutes.
            <br />
            <span className="text-[#E4002B]">Agents read it every call.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-white/65">
            The API is in development. Integrate against the 402 shape today —
            it will not change — and ask for a dev key to receive live data
            before launch.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://x.com/quorumnewsX"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#E4002B] px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[#c40025]"
            >
              Join the dev preview
            </a>
            <a
              href="https://github.com/Quorum-Robinhood-Chain/quorum"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/25 px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white/10"
            >
              Read the source
            </a>
          </div>
          <p className="mt-10 text-xs text-white/40">
            Independent. Not affiliated with Robinhood Markets, Inc. Data is
            provided as-is and is not financial advice.
          </p>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  dark,
}: {
  eyebrow: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
          dark ? 'text-[#E4002B]' : 'text-[#E4002B]'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl ${
          dark ? 'text-white' : ''
        }`}
      >
        {title}
      </h2>
    </div>
  );
}

function Problem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t-2 border-[#0A1A33] pt-4">
      <h3 className="text-base font-bold uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-black/60">{children}</p>
    </div>
  );
}
