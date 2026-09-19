import type { Metadata } from 'next';
import NewsArchive from '@/components/NewsArchive';
import Reveal from '@/components/motion/Reveal';
import { getArticlesPresentation } from '@/lib/presenters/articles';
import { newsCategories } from '@/data/news';
import type { ArticleCategory } from '@/types';

// Articles regenerate every ~30 min (see cron.yml) — cache for up to 60s
// and revalidate in the background instead of hitting the DB every request.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'News — Quorum',
  description:
    "Every Robinhood Chain article from Quorum's automated desk and curated reporting, most recent first.",
};

export default async function NewsPage({
  searchParams,
}: {
  // e.g. /news?category=Markets — used by the footer's News menu deep links.
  searchParams?: { category?: string };
}) {
  // Fetch the latest articles and live data status.
  const { articles, usingLiveData } = await getArticlesPresentation({
    limit: 50,
  });

  // Only trust the query param if it matches a real, filterable category.
  const requestedCategory = searchParams?.category;
  const initialCategory: ArticleCategory | 'All' = newsCategories.includes(
    requestedCategory as ArticleCategory,
  )
    ? (requestedCategory as ArticleCategory)
    : 'All';

  return (
    <main>

      {/* News archive with category filters */}
      <Reveal>
        <NewsArchive
          articles={articles}
          categories={newsCategories}
          usingLiveData={usingLiveData}
          initialCategory={initialCategory}
        />
      </Reveal>
    </main>
  );
}
