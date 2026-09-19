import type { Metadata } from 'next';
import TokensSection from '@/components/TokensSection';
import Reveal from '@/components/motion/Reveal';

// Token prices refresh on the same ~5 min market cycle (see cron.yml).
export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Tokens — Quorum',
  description:
    'Trending Robinhood Chain tokens by 24h volume — Stock Tokens and DeFi, pulled from live market data.',
};

export default function TokensPage() {
  return (
    <main>
      <Reveal>
        <TokensSection />
      </Reveal>
    </main>
  );
}
