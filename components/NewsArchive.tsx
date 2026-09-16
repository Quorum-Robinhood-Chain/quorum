'use client';

import { useMemo, useState } from 'react';
import { ArticleCategory, Article } from '@/types';
import { CategoryThumb } from '@/lib/categoryVisual';

export default function NewsArchive({
  articles,
  categories,
  usingLiveData,
}: {
  articles: Article[];
  categories: ArticleCategory[];
  usingLiveData: boolean;
}) {
  // Track the currently selected news category
  const [active, setActive] = useState<ArticleCategory | 'All'>('All');

  // Filter articles based on the selected category
  const filtered = useMemo(
    () =>
      active === 'All'
        ? articles
        : articles.filter((a) => a.category === active),
    [active, articles],
  );

  return (
    <section className="mx-auto max-w-site px-6 pb-10">
      {/* News archive header */}
      <div className="border-b-2 border-ink pb-4.5 pt-9 mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">News</h1>
        {!usingLiveData && (
          <span className="mt-3 inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Sample data — live feed not connected yet
          </span>
        )}
      </div>

      {/* Category filter buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['All', ...categories] as const).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active === category
                ? 'border-ink bg-ink text-white'
                : 'border-line text-gray-600 hover:border-gray-400'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Filtered news articles */}
      <div className="flex flex-col divide-y divide-line rounded-card border border-line">
        {filtered.map((article) => (
          <a
            key={article.id}
            href={article.href}
            className="flex flex-col gap-1.5 p-4.5 hover:bg-panel sm:flex-row sm:items-start sm:gap-5"
          >
            <CategoryThumb
              category={article.category}
              className="flex h-16 w-full shrink-0 items-center justify-center rounded-card bg-[#00152B] sm:h-20 sm:w-28"
            />

            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-olive">
                {article.category}
              </span>

              <h3 className="mt-1 text-[16px] font-bold leading-snug text-ink">
                {article.headline}
              </h3>

              {article.dek && (
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  {article.dek}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                <span>{article.desk}</span>
                <span>·</span>
                <span>{article.timeAgo}</span>
                <span>·</span>
                <span>{article.readTime}</span>

                {article.automated ? (
                  <span className="ml-1 rounded-full bg-lime-tint px-2 py-0.5 font-semibold text-olive">
                    Automated
                  </span>
                ) : (
                  article.source.name !== 'Quorum' && (
                    <>
                      <span>·</span>
                      <span>via {article.source.name}</span>
                    </>
                  )
                )}
              </div>
            </div>
          </a>
        ))}

        {/* Display a message when no articles match the filter */}
        {filtered.length === 0 && (
          <p className="p-4.5 text-sm text-gray-600">
            No articles in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}
