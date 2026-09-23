import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CATALOG,
  HOLDER_DISCOUNT_MIN,
  HOLDER_DISCOUNT_RATE,
  PAY_TO,
  X402_ASSET_DECIMALS,
  X402_ASSET_SYMBOL,
  X402_MODE,
  X402_NETWORK,
  toBaseUnits,
} from '@/lib/x402/config';

export const metadata: Metadata = {
  title: 'API Catalog — Quorum for Autonomous Agents',
  description:
    'Every Quorum endpoint, priced per call over x402 on Robinhood Chain (chain 4663).',
};

export const dynamic = 'force-dynamic';

export default function CatalogPage() {
  return (
    <main className="bg-white text-[#0A1A33]">
      {/* ── Header ───────────────────────────────────────────── */}
      <section className="border-b-4 border-[#E4002B] bg-[#0A1A33] text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <Link
            href="/agents"
            className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white"
          >
            ← Back to agents
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              API catalog
            </h1>
            <span className="bg-[#E4002B] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
              {X402_MODE === 'live' ? 'Live' : 'Dev preview'}
            </span>
          </div>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            News, sentiment and risk flags for the Robinhood Chain ecosystem
            (chain 4663), priced per call over x402. This page is a
            human-readable view of{' '}
            <a
              href="/api/catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              /api/catalog
            </a>
            , the machine-readable endpoint agents call directly.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-white/15 pt-6 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-white/50 uppercase tracking-wider text-[11px]">
                Network
              </dt>
              <dd className="mt-1 font-mono">{X402_NETWORK}</dd>
            </div>
            <div>
              <dt className="text-white/50 uppercase tracking-wider text-[11px]">
                Asset
              </dt>
              <dd className="mt-1 font-mono">
                {X402_ASSET_SYMBOL} ({X402_ASSET_DECIMALS}d)
              </dd>
            </div>
            <div>
              <dt className="text-white/50 uppercase tracking-wider text-[11px]">
                Scheme
              </dt>
              <dd className="mt-1 font-mono">exact</dd>
            </div>
            <div>
              <dt className="text-white/50 uppercase tracking-wider text-[11px]">
                Pay to
              </dt>
              <dd className="mt-1 truncate font-mono">{PAY_TO || '—'}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Holder discount ──────────────────────────────────── */}
      <section className="border-b border-black/10 bg-[#F5F6F8]">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm leading-relaxed text-[#0A1A33]/80">
          <span className="mr-2 bg-[#0A1A33] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            $QUORUM holder discount
          </span>
          Paying wallets holding at least {HOLDER_DISCOUNT_MIN} $QUORUM pay{' '}
          {HOLDER_DISCOUNT_RATE * 100}% of list price, verified with a live
          balanceOf call on chain 4663.
        </div>
      </section>

      {/* ── Endpoints ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="mb-6 text-xl font-black uppercase tracking-tight">
          Endpoints
        </h2>

        <div className="divide-y divide-black/10 border border-black/10">
          {CATALOG.map((e) => {
            const holderPrice = (
              Number(e.price) * HOLDER_DISCOUNT_RATE
            ).toFixed(6);

            return (
              <div
                key={e.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#0A1A33] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      {e.method}
                    </span>
                    <code className="text-sm font-bold">{e.path}</code>
                  </div>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#0A1A33]/70">
                    {e.summary}
                  </p>
                  <p className="mt-2 text-xs text-[#0A1A33]/50">
                    Returns:{' '}
                    <span className="font-mono">{e.returns.join(', ')}</span>
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-lg font-black">
                    {e.price} {X402_ASSET_SYMBOL}
                  </div>
                  <div className="text-xs text-[#0A1A33]/50">
                    {toBaseUnits(e.price)} base units
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#E4002B]">
                    {holderPrice} {X402_ASSET_SYMBOL} for holders
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/api/catalog"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#0A1A33]/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#F5F6F8]"
          >
            Raw JSON ↗
          </a>
          <a
            href="/api/v1/stats"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#0A1A33]/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#F5F6F8]"
          >
            Usage stats ↗
          </a>
        </div>
      </section>
    </main>
  );
}
