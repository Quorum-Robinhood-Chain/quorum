import { getArticlesPresentation } from '@/lib/presenters/articles';
import { getNetworkSnapshotPresentation } from '@/lib/presenters/network-snapshot';
import { CategoryThumb } from '@/lib/categoryVisual';

export default async function MarketsOverview() {
  // Fetch market statistics and market-related articles from the last 24 hours
  const [
    { items: marketStats, usingAnyLiveData },
    { articles: marketArticles },
  ] = await Promise.all([
    getNetworkSnapshotPresentation(),
    getArticlesPresentation({ sinceHours: 24 }),
  ]);

  return (
    <section className="mx-auto max-w-site px-6 pb-10">
      {/* Markets section header */}
      <div className="border-b-2 border-ink pb-4.5 pt-9 mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Markets
        </h1>

        {!usingAnyLiveData && (
          <span className="mt-3 inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Sample data — live feed not connected yet
          </span>
        )}
      </div>

      {/* Market statistics overview */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {marketStats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-line p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {stat.label}
            </div>

            <div
              className={`mt-1 font-display text-lg font-bold ${
                stat.trend === 'down' ? 'text-danger' : 'text-ink'
              }`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Latest market movements */}
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold text-ink">
          Market moves
        </h2>

        <a
          className="text-[13.5px] font-semibold text-olive hover:underline"
          href="/tokens"
        >
          See full token board
        </a>
      </div>

      {/* Market-related articles from the last 24 hours */}
      {marketArticles.length === 0 && (
        <p className="mb-10 text-sm text-gray-400">
          No market news in the last 24 hours.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {marketArticles.map((article) => (
          <article
            key={article.id}
            className="group relative flex flex-col rounded-card border border-line p-4.5 transition hover:border-olive/60 hover:shadow-sm"
          >
            <CategoryThumb
              category={article.category}
              className="mb-3 flex aspect-video w-full items-center justify-center overflow-hidden rounded-card bg-[#00152B]"
            />

            <span className="text-[11.5px] font-bold uppercase tracking-wide text-olive">
              {article.category}
            </span>

            <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-ink">
              {/* Stretched link: makes the whole card clickable while keeping
                  valid HTML (no anchor nested inside another anchor) */}
              <a
                href={article.href}
                className="after:absolute after:inset-0 after:content-[''] group-hover:underline"
              >
                {article.headline}
              </a>
            </h3>

            {article.dek && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {article.dek}
              </p>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-x-2 pt-3 text-xs text-gray-400">
              <span>{article.desk}</span>
              <span>·</span>
              <span>{article.timeAgo}</span>

              {!article.automated && article.source.name !== 'Quorum' && (
                <>
                  <span>·</span>
                  <span>
                    via{' '}
                    <a
                      className="relative z-10 hover:underline"
                      href={article.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {article.source.name}
                    </a>
                  </span>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
