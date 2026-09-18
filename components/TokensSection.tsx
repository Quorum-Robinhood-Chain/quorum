import { getTokensPresentation } from '@/lib/presenters/tokens';
import { tokenCategoryLabels } from '@/data/tokens';
import { TokenCategory } from '@/types';

const CATEGORY_ORDER: TokenCategory[] = ['trending', 'defi'];

export default async function TokensSection() {
  // Fetch token data and live feed status
  const { tokens: trendingTokens, usingLiveData } =
    await getTokensPresentation();

  return (
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

      {/* Trending and Defi sit SIDE BY SIDE (not stacked). Each category
          keeps its own 2-column × 5-row sub-grid, so visually you get
          4 columns total: col 1-2 = trending, col 3-4 = defi. Index
          numbering (#1-#10) is still per-category, so if one category
          has fewer than 10 tokens it never "leaks" into the other
          category's columns. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        {CATEGORY_ORDER.map((category) => {
          let rows = trendingTokens.filter((t) => t.category === category);
          if (rows.length === 0) return null;

          // Tokens that already have a price take priority over ones still
          // showing "—", and we only ever show the top 10.
          rows = [...rows]
            .sort((a, b) => Number(b.price !== '—') - Number(a.price !== '—'))
            .slice(0, 10);

          return (
            <div key={category} className="flex-1 lg:basis-1/2">
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-olive">
                {category === 'trending'
                  ? '10 Top Trending Token'
                  : '10 Top Defi Token'}
              </h3>

              {/* Fixed at 5 rows on every breakpoint (not fewer on large
                  screens) so it always reads as 2 columns × 5 rows —
                  genuinely flowing down, not a wide short grid. */}
              <div className="grid grid-flow-col grid-rows-5 auto-cols-fr gap-2.5">
                {rows.map((token, index) => (
                  <div
                    key={token.id}
                    className="group relative flex flex-col justify-between gap-3 rounded-card border border-line bg-white px-3.5 py-4 transition-colors duration-200 hover:border-olive hover:bg-olive"
                  >
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white transition-colors duration-200 group-hover:bg-white group-hover:text-olive">
                      {index + 1}
                    </span>

                    <div className="min-w-0 pr-7">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-ink transition-colors duration-200 group-hover:text-white">
                          {token.symbol}
                        </span>
                      </div>
                      <div className="truncate text-xs text-gray-400 transition-colors duration-200 group-hover:text-white/80">
                        {token.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-400 transition-colors duration-200 group-hover:text-white/80">
                        via {token.dex} · 24h vol {token.volume24h}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="text-sm font-semibold text-ink transition-colors duration-200 group-hover:text-white">
                        {token.price}
                      </div>

                      <div
                        className={`text-xs font-semibold transition-colors duration-200 group-hover:text-white ${
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
