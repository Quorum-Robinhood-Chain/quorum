import type { Metadata } from 'next';
import NewsArchive from '@/components/NewsArchive';
import { getArticlesPresentation } from '@/lib/presenters/articles';
import { newsCategories } from '@/data/news';

// Articles regenerate every ~30 min (see cron.yml) — cache for up to 60s
// and revalidate in the background instead of hitting the DB every request.
export const revalidate = 60;

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
