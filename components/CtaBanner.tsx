import { getNetworkSnapshotPresentation } from '@/lib/presenters/network-snapshot';
import ConnectWalletButton from '@/components/ConnectWalletButton';

// Fetch the latest network snapshot for the CTA statistics.
export default async function CtaBanner() {
  const { items } = await getNetworkSnapshotPresentation();
  const stats = items.slice(0, 4);

  return (
    <section className="cta-banner">
      <div className="cta-inner">
        {/* CTA heading and supporting description */}
        <div>
          <h2>
            Track every move on Robinhood Chain,{' '}
            <span className="accent">as it happens</span>.
          </h2>
          <p>
            Live TVL, DEX volume, and Stock Token activity pulled straight from
            on-chain and market data — refreshed automatically, reviewed by
            editors, never guessed at.
          </p>

          {/* CTA navigation links */}
          <div className="cta-actions">
            <a className="btn-lime" href="#news">
              See today&apos;s digest
            </a>
            <ConnectWalletButton variant="ghost" />
          </div>
        </div>

        {/* Network statistics */}
        <div className="cta-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="num">{stat.value}</div>
              <div className="lbl">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
