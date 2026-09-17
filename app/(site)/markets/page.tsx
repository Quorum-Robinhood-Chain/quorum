import type { Metadata } from 'next';
import MarketsOverview from '@/components/MarketsOverview';

// Market snapshots refresh every ~5 min (see cron.yml) — no need to hit
// the DB on every single request.
export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Markets — Quorum',
  description:
    'Live TVL, DEX volume, and Stock Token activity across the Robinhood Chain ecosystem, pulled from real market and on-chain data.',
};

export default function MarketsPage() {
  return (
    <main>
      {/* Financial disclaimer and site independence notice */}
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>

      {/* Market statistics and latest market news */}
      <MarketsOverview />
    </main>
  );
}
