import { getTokensPresentation } from '@/lib/presenters/tokens';
import { tokenCategoryLabels } from '@/data/tokens';
import { TokenCategory } from '@/types';

const CATEGORY_ORDER: TokenCategory[] = ['trending', 'defi'];

export default async function TokensSection() {
  // Fetch token data and live feed status
  const { tokens: trendingTokens, usingLiveData } =
    await getTokensPresentation();

  return (
    // Full-bleed: no max-w-site here, the section runs edge to edge.
    <section className="w-full px-6 pb-12 lg:px-10" id="tokens">
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

      {/* Tokens grouped by category — original stacked-list layout, now stretched full width */}
      <div className="grid gap-8 lg:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          let rows = trendingTokens.filter((t) => t.category === category);
          if (rows.length === 0) return null;

          // Trending: tokens that already have a price take priority over
          // ones still showing "—", and we only ever show the top 10.
          if (category === 'trending') {
            rows = [...rows]
              .sort((a, b) => Number(b.price !== '—') - Number(a.price !== '—'))
              .slice(0, 10);
          }

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
    </section>
  );
}
