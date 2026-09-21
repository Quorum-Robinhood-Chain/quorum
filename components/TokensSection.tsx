import { getTokensPresentation } from '@/lib/presenters/tokens';
import { tokenCategoryLabels } from '@/data/tokens';
import { externalTokenUrl } from '@/lib/market/external-links';
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

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        {CATEGORY_ORDER.map((category) => {
          let rows = trendingTokens.filter((t) => t.category === category);
          if (rows.length === 0) return null;

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

              <div className="grid grid-cols-2 gap-2.5">
                {rows.map((token, index) => (
                  <a
                    key={token.id}
                    href={externalTokenUrl(token)}
                    target="_blank"
                    rel="noopener noreferrer"
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
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
