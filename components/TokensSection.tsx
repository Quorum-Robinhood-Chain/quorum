import { getTokensPresentation } from '@/lib/presenters/tokens';
import { tokenCategoryLabels } from '@/data/tokens';
import { TokenCategory } from '@/types';

const CATEGORY_ORDER: TokenCategory[] = ['stock_token', 'defi', 'meme'];

export default async function TokensSection() {
  // Fetch token data and live feed status
  const { tokens: trendingTokens, usingLiveData } =
    await getTokensPresentation();

  return (
    // Add bottom padding to prevent content from touching the footer
    <section className="mx-auto max-w-site px-6 pb-12" id="tokens">
      {/* Tokens section header */}
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-4.5 pt-9 mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink">
          Tokens
        </h2>
        <a
          className="text-[13.5px] font-semibold text-olive hover:underline"
          href="#"
        >
          All token data
        </a>
      </div>

      {/* Show sample data notice when live data is unavailable */}
      {!usingLiveData && (
        <span className="mb-6 inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          Sample data — live feed not connected yet
        </span>
      )}

      {/* Tokens grouped by category */}
      <div className="grid gap-8 lg:grid-cols-3">
        {CATEGORY_ORDER.map((category) => {
          const rows = trendingTokens.filter((t) => t.category === category);
          if (rows.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-olive">
                {tokenCategoryLabels[category]}
              </h3>

              <div className="space-y-2.5">
                {rows.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-line px-3.5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-ink">
                          {token.symbol}
                        </span>
                        <span className="truncate text-xs text-gray-400">
                          {token.name}
                        </span>
                      </div>

                      <div className="mt-0.5 text-xs text-gray-400">
                        via {token.dex} · 24h vol {token.volume24h}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-ink">
                        {token.price}
                      </div>

                      <div
                        className={`text-xs font-semibold ${
                          token.isUp ? 'text-olive' : 'text-danger'
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

      {/* Data source and financial disclaimer */}
      <p className="mt-6 text-xs text-gray-400">
        Prices and volume refresh independently of the article pipeline. Not
        financial advice — token prices are volatile and this is not a
        recommendation to buy or sell.
      </p>
    </section>
  );
}
