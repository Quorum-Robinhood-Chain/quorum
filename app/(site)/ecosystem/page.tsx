import type { Metadata } from 'next';
import EcosystemGrid from '@/components/EcosystemGrid';
import Reveal from '@/components/motion/Reveal';

// Protocol integrations and TVL change far less often than articles or
// market snapshots — cache longer.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Ecosystem — Quorum',
  description:
    'Protocol integrations, TVL, and new deployments on Robinhood Chain — Arcus, Uniswap, 1inch, Lighter, Morpho, and Chainlink.',
};

export default function EcosystemPage() {
  return (
    <main>

      {/* Ecosystem protocols and latest news */}
      <Reveal>
        <EcosystemGrid />
      </Reveal>
    </main>
  );
}
