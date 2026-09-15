import { marketCards } from "@/data/articles";

export default function MarketsSection() {
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
