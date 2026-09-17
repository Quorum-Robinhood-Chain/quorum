import type { Metadata } from 'next';
import TokensSection from '@/components/TokensSection';

// Token prices refresh on the same ~5 min market cycle (see cron.yml).
export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Tokens — Quorum',
  description:
    'Trending Robinhood Chain tokens by 24h volume — Stock Tokens, DeFi, and memecoins, pulled from live market data.',
};

export default function TokensPage() {
  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>
      <TokensSection />
    </main>
  );
}
