import type { Metadata } from "next";
import NewsArchive from "@/components/NewsArchive";
import { getArticlesPresentation } from "@/lib/presenters/articles";
import { newsCategories } from "@/data/news";

// Live data on every request — never served from the build-time cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "News — Quorum",
  description:
    "Every Robinhood Chain article from Quorum's automated desk and curated reporting, most recent first.",
};

export default async function NewsPage() {
  const { articles, usingLiveData } = await getArticlesPresentation({ limit: 50 });

  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with Robinhood Markets,
        Inc.
      </div>
      <NewsArchive articles={articles} categories={newsCategories} usingLiveData={usingLiveData} />
    </main>
  );
}
