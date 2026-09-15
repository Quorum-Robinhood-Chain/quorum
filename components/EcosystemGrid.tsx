import { protocolCategoryLabels, protocolCategoryOrder, protocols } from "@/data/ecosystem";
import { latestNews, marketCards } from "@/data/articles";

// Ecosystem page: protocol integrations/TVL, replaces Governance/Staking.
const ecosystemNews = [...marketCards, ...latestNews].filter(
  (article) => article.category === "Ecosystem",
);

export default function EcosystemGrid() {
  return (
    <section className="mx-auto max-w-site px-6 pb-10">
      <div className="border-b-2 border-ink pb-[18px] pt-9 mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">Ecosystem</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Protocol integrations, TVL, and new deployments on Robinhood Chain. There&apos;s no
          native governance token here — economic exposure to the chain runs through
          Robinhood&apos;s Nasdaq-listed equity (HOOD), not an on-chain token you can stake or
          vote with.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {protocolCategoryOrder.map((category) => {
          const rows = protocols.filter((p) => p.category === category);
          if (rows.length === 0) return null;
          return (
            <div key={category}>
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-olive">
                {protocolCategoryLabels[category]}
              </h2>
              <div className="flex flex-col gap-3">
                {rows.map((protocol) => (
                  <div key={protocol.id} className="rounded-card border border-line p-[18px]">
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
                          protocol.isUp ? "text-olive" : "text-danger"
                        }`}
                      >
                        {protocol.change7d} TVL · 7d
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {ecosystemNews.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-extrabold text-ink">Ecosystem news</h2>
            <a className="text-[13.5px] font-semibold text-olive hover:underline" href="/news">
              All news
            </a>
          </div>
          <div className="flex flex-col divide-y divide-line rounded-card border border-line">
            {ecosystemNews.map((article) => (
              <a
                key={article.id}
                href={article.href}
                className="flex flex-col gap-1 p-[18px] hover:bg-panel"
              >
                <h3 className="text-[15px] font-bold leading-snug text-ink">
                  {article.headline}
                </h3>
                {article.dek && <p className="text-sm text-gray-600">{article.dek}</p>}
                <span className="text-xs text-gray-400">
                  {article.desk} · {article.timeAgo}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-gray-400">
        TVL figures pulled from DefiLlama and the Morpho API. Not financial advice.
      </p>
    </section>
  );
}
