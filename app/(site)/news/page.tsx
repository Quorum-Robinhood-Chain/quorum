import type { Metadata } from 'next';
import NewsArchive from '@/components/NewsArchive';
import { getArticlesPresentation } from '@/lib/presenters/articles';
import { newsCategories } from '@/data/news';

// Always fetch live news data on each request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'News — Quorum',
  description:
    "Every Robinhood Chain article from Quorum's automated desk and curated reporting, most recent first.",
};

export default async function NewsPage() {
  // Fetch the latest articles and live data status.
  const { articles, usingLiveData } = await getArticlesPresentation({
    limit: 50,
  });

  return (
    <main>
      {/* Financial disclaimer and site independence notice */}
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>

      {/* News archive with category filters */}
      <NewsArchive
        articles={articles}
        categories={newsCategories}
        usingLiveData={usingLiveData}
      />
    </main>
  );
}
