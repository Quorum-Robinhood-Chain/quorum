import { Clock, Newspaper, Timer, Bot, Lock } from 'lucide-react';
import { getArticlesPresentation } from '@/lib/presenters/articles';
import { CategoryThumb } from '@/lib/categoryVisual';

export default async function NewsList() {
  // Fetch the 5 latest news articles.
  const { articles: latestNews } = await getArticlesPresentation({ limit: 5 });

  return (
    <div className="main-col" id="news">
      {/* Latest news section header */}
      <div className="section-head">
        <h2>Latest news</h2>
        <a className="view-all" href="/news">
          News archive
        </a>
      </div>

      {/* Latest news articles */}
      {latestNews.map((article) => (
        <a className="list-story" href={article.href} key={article.id}>
          <CategoryThumb category={article.category} />
          <div>
            <span className="cat">{article.category}</span>
            <h3>{article.headline}</h3>
            <p>{article.dek}</p>
            <span className="meta">
              {article.gated && (
                <span className="meta-bit gated-badge">
                  <Lock
                    className="meta-icon"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  Holder-only
                </span>
              )}
              <span className="meta-bit">
                {article.automated ? (
                  <Bot
                    className="meta-icon"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                ) : (
                  <Newspaper
                    className="meta-icon"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                )}
                {article.desk}
              </span>
              <span className="meta-bit">
                <Clock
                  className="meta-icon"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                {article.timeAgo}
              </span>
              <span className="meta-bit">
                <Timer
                  className="meta-icon"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                {article.readTime}
              </span>
              {!article.automated && article.source.name !== 'Quorum' && (
                <span className="meta-bit">
                  via{' '}
                  <a
                    href={article.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.source.name}
                  </a>
                </span>
              )}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
