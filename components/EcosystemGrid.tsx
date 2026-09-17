import { getEcosystemPresentation } from '@/lib/presenters/ecosystem';
import { getArticlesPresentation } from '@/lib/presenters/articles';
import {
  protocolCategoryLabels,
  protocolCategoryOrder,
} from '@/data/ecosystem';

export default async function EcosystemGrid() {
  // Fetch ecosystem protocols and the 3 latest ecosystem news articles.
  const [{ protocols, usingLiveData }, { articles: ecosystemNews }] =
    await Promise.all([
      getEcosystemPresentation(),
      getArticlesPresentation({ category: 'Ecosystem', limit: 3 }),
    ]);

  return (
    <section className="mx-auto max-w-site px-6 pb-10">
      {/* Ecosystem page header */}
      <div className="border-b-2 border-ink pb-4.5 pt-9 mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Ecosystem
        </h1>
        {!usingLiveData && (
          <span className="mt-3 inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Sample data — live feed not connected yet
          </span>
        )}
      </div>

      {/* Protocols — flat grid, 3 across / 2 down, category shown on each card */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {protocolCategoryOrder
          .flatMap((category) =>
            protocols.filter((p) => p.category === category),
          )
          .map((protocol) => (
            <div
              key={protocol.id}
              className="flex flex-col rounded-card border border-line p-4.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold text-ink">
                  {protocol.name}
                </h3>
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {protocol.tvl}
                </span>
              </div>

              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {protocol.description}
              </p>

              {protocol.change7d && (
                <div
                  className={`mt-2 text-xs font-semibold ${
                    protocol.isUp ? 'text-olive' : 'text-danger'
                  }`}
                >
                  {protocol.change7d} TVL · 7d
                </div>
              )}

              {/* Category label anchored to bottom-left of the card */}
              <div className="mt-auto pt-3">
                <span className="inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-olive">
                  {protocolCategoryLabels[protocol.category]}
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Latest ecosystem news */}
      {ecosystemNews.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-extrabold text-ink">
              Ecosystem news
            </h2>

            <a
              className="text-[13.5px] font-semibold text-olive hover:underline"
              href="/news"
            >
              All news
            </a>
          </div>

          <div className="flex flex-col divide-y divide-line rounded-card border border-line">
            {ecosystemNews.map((article) => (
              <a
                key={article.id}
                href={article.href}
                className="flex flex-col gap-1 p-4.5 hover:bg-panel"
              >
                <h3 className="text-[15px] font-bold leading-snug text-ink">
                  {article.headline}
                </h3>

                {article.dek && (
                  <p className="text-sm text-gray-600">{article.dek}</p>
                )}

                <span className="text-xs text-gray-400">
                  {article.desk} · {article.timeAgo}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Data source disclaimer */}
      <p className="mt-8 text-xs text-gray-400">
        TVL figures pulled from DefiLlama and the Morpho API. Not financial
        advice.
      </p>
    </section>
  );
}
