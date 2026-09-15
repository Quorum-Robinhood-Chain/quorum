import { trending } from "@/data/articles";
import { networkSnapshot } from "@/data/stats";
import NewsletterForm from "@/components/NewsletterForm";

export default function Sidebar() {
  return (
    <aside className="side-col">
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

      <div className="side-panel stat-panel">
        <h3 className="panel-title">Network Snapshot</h3>
        {networkSnapshot.map((stat) => (
          <div className="stat-row" key={stat.label}>
            <span>{stat.label}</span>
            <span className={`val${stat.trend ? ` ${stat.trend}` : ""}`}>{stat.value}</span>
          </div>
        ))}
        <p className="updated">Last updated moments ago · via DefiLlama, Morpho</p>
      </div>

      <div className="side-panel newsletter-panel">
        <h3 className="panel-title">Weekly Digest</h3>
        <p>
          One email every Friday: ecosystem moves, token activity, and what&apos;s new on
          Robinhood Chain — no hype, not financial advice.
        </p>
        <NewsletterForm />
      </div>
    </aside>
  );
}
