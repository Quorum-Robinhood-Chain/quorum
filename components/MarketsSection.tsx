import { getArticlesPresentation } from '@/lib/presenters/articles';
import { CategoryThumb } from '@/lib/categoryVisual';

export default async function MarketsSection() {
  // Fetch the 3 latest market articles.
  const { articles: marketCards } = await getArticlesPresentation({
    limit: 3,
    category: 'Markets',
  });

  return (
    <section className="wrap" id="markets">
      {/* Markets section header */}
      <div className="section-head">
        <h2>Markets</h2>
        <a className="view-all" href="/markets">
          All market data
        </a>
      </div>

      {/* Market article cards */}
      <div className="news-grid">
        {marketCards.map((article) => (
          <a className="card" href={article.href} key={article.id}>
            <CategoryThumb category={article.category} />
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
          </a>
        ))}
      </div>
    </section>
  );
}
