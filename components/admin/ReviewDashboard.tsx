'use client';

import { useState } from 'react';
import ReviewQueueTable from './ReviewQueueTable';
import type { ReviewArticle } from '@/types';

// Owns the review-queue state so the summary cards and the table always
// reflect the same data — any mutation in the table (status change, reject,
// edit) instantly recomputes the cards below, no page reload needed.
export default function ReviewDashboard({
  initialArticles,
  usingLiveData,
  sourcesMonitored,
}: {
  initialArticles: ReviewArticle[];
  usingLiveData: boolean;
  sourcesMonitored: number;
}) {
  const [articles, setArticles] = useState(initialArticles);

  const flagged = articles.filter((a) => a.flagged).length;
  const published = articles.filter((a) => a.status === 'published').length;
  const automatedShare = articles.length
    ? Math.round(
        (articles.filter((a) => a.automated).length / articles.length) * 100,
      )
    : 0;

  return (
    <>
      {/* Dashboard summary statistics */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card border border-line bg-white p-4">
          <div className="text-2xl font-extrabold text-ink">{flagged}</div>
          <div className="mt-1 text-xs text-gray-600">Flagged for review</div>
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <div className="text-2xl font-extrabold text-ink">{published}</div>
          <div className="mt-1 text-xs text-gray-600">Published</div>
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <div className="text-2xl font-extrabold text-ink">
            {automatedShare}%
          </div>
          <div className="mt-1 text-xs text-gray-600">Automated-generated</div>
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <div className="text-2xl font-extrabold text-ink">
            {sourcesMonitored}
          </div>
          <div className="mt-1 text-xs text-gray-600">Sources monitored</div>
        </div>
      </div>

      {/* Editorial review table */}
      <div className="mt-6">
        <ReviewQueueTable
          articles={articles}
          onArticlesChange={setArticles}
          usingLiveData={usingLiveData}
        />
      </div>
    </>
  );
}
