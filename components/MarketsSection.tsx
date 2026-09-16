import { getArticlesPresentation } from "@/lib/presenters/articles";

// Homepage "Markets" card grid (bukan halaman /markets). Wired to the DB via
// getArticlesPresentation — general recent published articles, same simplification the
// original static data/articles.ts set used. Falls back to the static placeholder set if
// nothing's live yet.
export default async function MarketsSection() {
  const { articles: marketCards } = await getArticlesPresentation({ limit: 3,  category: "Markets" });

  return (
    <section className="wrap" id="markets">
      <div className="section-head">
        <h2>Markets</h2>
        <a className="view-all" href="/markets">
          All market data
        </a>
      </div>
      <div className="news-grid">
        {marketCards.map((article) => (
          <article className="card" key={article.id}>
            <div className="thumb" aria-hidden="true" />
            <span className="cat">{article.category}</span>
            <h3>{article.headline}</h3>
            <p className="excerpt">{article.dek}</p>
            <div className="meta">
              <span>{article.desk}</span>
              <span>·</span>
              <span>{article.timeAgo}</span>
              {article.automated && (
                <>
                  <span>·</span>
                  <span>Automated</span>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
