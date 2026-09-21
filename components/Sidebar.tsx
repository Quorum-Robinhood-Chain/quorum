import { trending } from '@/data/articles';
import ConnectWalletButton from '@/components/ConnectWalletButton';
import { getNetworkSnapshotPresentation } from '@/lib/presenters/network-snapshot';

export default async function Sidebar() {
  // Fetch the latest network snapshot and update status.
  const { items: networkSnapshot, updatedLabel } =
    await getNetworkSnapshotPresentation();

  return (
    <aside className="side-col">
      {/* Trending stories */}
      <div className="side-panel">
        <h3 className="panel-title">Chain Pulse</h3>
        {trending.map((item) => (
          <div className="trend-row" key={item.rank}>
            <span className="rank">{item.rank}</span>
            <div className="info">
              <h4>{item.headline}</h4>
              <span>{item.category}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Network statistics */}
      <div className="side-panel stat-panel">
        <h3 className="panel-title">Network Snapshot</h3>
        {networkSnapshot.map((stat) => (
          <div className="stat-row" key={stat.label}>
            <span>{stat.label}</span>
            <span className={`val${stat.trend ? ` ${stat.trend}` : ''}`}>
              {stat.value}
            </span>
          </div>
        ))}
        <p className="updated">{updatedLabel}</p>
      </div>

      {/* Wallet connect */}
      <div className="side-panel newsletter-panel">
        <h3 className="panel-title">Connect Wallet</h3>
        <p>
          Connect to track Stock Token balances and DEX activity tied to your
          address on Robinhood Chain — read-only, no transaction ever requested
          here.
        </p>
        <ConnectWalletButton variant="panel" />
      </div>
    </aside>
  );
}
