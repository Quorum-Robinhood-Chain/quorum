import { trendingTokens, tokenCategoryLabels } from "@/data/tokens";
import { TokenCategory } from "@/types";

// Tokens page: replaces old Governance/Staking. Memecoins shown separately.
const CATEGORY_ORDER: TokenCategory[] = ["stock_token", "defi", "meme"];

export default function TokensSection() {
  return (
    <section className="mx-auto max-w-site px-6" id="tokens">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-[18px] pt-9 mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink">Tokens</h2>
        <a className="text-[13.5px] font-semibold text-olive hover:underline" href="#">
          All token data
        </a>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Trending tokens by 24h volume across Robinhood Chain DEXs, pulled from DefiLlama and DEX
        subgraphs — not inferred from article text (dev-brief §7.2). Memecoin activity is real and
        shown here, but kept separate from Stock Tokens and DeFi: Robinhood itself has publicly
        distanced itself from that trading.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {CATEGORY_ORDER.map((category) => {
          const rows = trendingTokens.filter((t) => t.category === category);
          if (rows.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-olive">
                {tokenCategoryLabels[category]}
              </h3>
              <div className="divide-y divide-line rounded-card border border-line">
                {rows.map((token) => (
                  <div key={token.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-ink">
                          {token.symbol}
                        </span>
                        <span className="truncate text-xs text-gray-400">{token.name}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">
                        via {token.dex} · 24h vol {token.volume24h}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-ink">{token.price}</div>
                      <div
                        className={`text-xs font-semibold ${
                          token.isUp ? "text-olive" : "text-danger"
                        }`}
                      >
                        {token.change24h}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Prices and volume refresh independently of the article pipeline. Not financial advice —
        token prices are volatile and this is not a recommendation to buy or sell.
      </p>
    </section>
  );
}
