import { marketArticles, marketStats } from "@/data/markets";

// Full markets page — target of the homepage's "View all" link.
export default function MarketsOverview() {
  return (
    <section className="mx-auto max-w-site px-6 pb-10">
      <div className="border-b-2 border-ink pb-[18px] pt-9 mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">Markets</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Live TVL, DEX volume, and Stock Token activity across the Robinhood Chain ecosystem,
          pulled from DefiLlama, DEX subgraphs, and Chainlink feeds — not inferred from article
          text.
        </p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {marketStats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-line p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {stat.label}
            </div>
            <div
              className={`mt-1 font-display text-lg font-bold ${
                stat.trend === "down" ? "text-danger" : "text-ink"
              }`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold text-ink">Market moves</h2>
        <a className="text-[13.5px] font-semibold text-olive hover:underline" href="/tokens">
          See full token board
        </a>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {marketArticles.map((article) => (
          <article
            key={article.id}
            className="flex flex-col rounded-card border border-line p-[18px]"
          >
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-olive">
              {article.category}
            </span>
            <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-ink">
              {article.headline}
            </h3>
            {article.dek && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{article.dek}</p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-x-2 pt-3 text-xs text-gray-400">
              <span>{article.desk}</span>
              <span>·</span>
              <span>{article.timeAgo}</span>
              {article.automated ? (
                <span className="ml-1 rounded-full bg-lime-tint px-2 py-0.5 font-semibold text-olive">
                  Automated
                </span>
              ) : (
                article.source.name !== "Quorum" && (
                  <>
                    <span>·</span>
                    <span>
                      via{" "}
                      <a
                        className="hover:underline"
                        href={article.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {article.source.name}
                      </a>
                    </span>
                  </>
                )
              )}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Prices and volume refresh independently of the article pipeline. Not financial advice —
        nothing here is a recommendation to buy or sell.
      </p>
    </section>
  );
}
