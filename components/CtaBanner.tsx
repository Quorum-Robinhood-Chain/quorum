import { ctaStats } from "@/data/stats";

// CTA rewritten off staking/governance framing (doesn't exist here).
export default function CtaBanner() {
  return (
    <section className="cta-banner">
      <div className="cta-inner">
        <div>
          <h2>
            Track every move on Robinhood Chain, <span className="accent">as it happens</span>.
          </h2>
          <p>
            Live TVL, DEX volume, and Stock Token activity pulled straight from on-chain and
            market data — refreshed automatically, reviewed by editors, never guessed at.
          </p>
          <div className="cta-actions">
            <a className="btn-lime" href="#news">
              See today&apos;s digest
            </a>
            <a className="btn-ghost" href="#subscribe">
              Get the weekly email
            </a>
          </div>
        </div>
        <div className="cta-stats">
          {ctaStats.map((stat) => (
            <div key={stat.label}>
              <div className="num">{stat.num}</div>
              <div className="lbl">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
