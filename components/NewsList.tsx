import { getArticlesPresentation } from "@/lib/presenters/articles";

// Homepage "Latest news" rail. Wired to the DB via getArticlesPresentation — general recent
// published articles (no single category), same simplification the original static data/
// articles.ts set used. Falls back to the static placeholder set if nothing's live yet.
export default async function NewsList() {
  const { articles: latestNews } = await getArticlesPresentation({ limit: 5 });

  return (
    <div className="main-col" id="news">
      <div className="section-head">
        <h2>Latest news</h2>
        <a className="view-all" href="/news">
          News archive
        </a>
      </div>

      {latestNews.map((article) => (
        <a className="list-story" href={article.href} key={article.id}>
          <div className="thumb" aria-hidden="true" />
          <div>
            <span className="cat">{article.category}</span>
            <h3>{article.headline}</h3>
            <p>{article.dek}</p>
            <span className="meta">
              <span>{article.desk}</span>
              <span>·</span>
              <span>{article.timeAgo}</span>
              <span>·</span>
              <span>{article.readTime}</span>
              {!article.automated && article.source.name !== "Quorum" && (
                <>
                  <span>·</span>
                  <span>
                    via{" "}
                    <a href={article.source.url} target="_blank" rel="noopener noreferrer">
                      {article.source.name}
                    </a>
                  </span>
                </>
              )}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
