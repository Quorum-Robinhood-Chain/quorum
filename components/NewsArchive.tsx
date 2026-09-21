'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { ArticleCategory, Article } from '@/types';
import { CategoryThumb } from '@/lib/categoryVisual';

// How many articles to show per page before paginating.
const PAGE_SIZE = 10;

// Build a compact page list (1 ... 4 5 6 ... 20) so the pager stays short
// no matter how many articles there are.
function getPageItems(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const items: (number | '…')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push('…');
    items.push(n);
  });
  return items;
}

export default function NewsArchive({
  articles,
  categories,
  usingLiveData,
  initialCategory = 'All',
}: {
  articles: Article[];
  categories: ArticleCategory[];
  usingLiveData: boolean;
  // Pre-selected category, e.g. from a ?category= deep link (footer, etc).
  initialCategory?: ArticleCategory | 'All';
}) {
  // Track the currently selected news category test
  const [active, setActive] = useState<ArticleCategory | 'All'>(
    initialCategory,
  );

  // Track the currently visible page of the (filtered) article list
  const [page, setPage] = useState(1);

  // Filter articles based on the selected category
  const filtered = useMemo(
    () =>
      active === 'All'
        ? articles
        : articles.filter((a) => a.category === active),
    [active, articles],
  );

  useEffect(() => {
    setPage(1);
  }, [active]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Filtered news articles (current page only) */}
      <div className="flex flex-col divide-y divide-line rounded-card border border-line">
        {paginated.map((article) => (
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-olive">
                  {article.category}
                </span>
                {article.gated && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-olive">
                    <Lock
                      className="h-2.5 w-2.5"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    Holder-only
                  </span>
                )}
              </div>

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

                {!article.automated && article.source.name !== 'Quorum' && (
                  <>
                    <span>·</span>
                    <span>via {article.source.name}</span>
                  </>
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

      {/* Pagination controls — only shown when there's more than one page */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            Prev
          </button>

          <div className="flex items-center gap-1.5">
            {getPageItems(page, totalPages).map((item, i) =>
              item === '…' ? (
                <span
                  key={`gap-${i}`}
                  className="flex h-7 w-5 items-center justify-center text-xs text-gray-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  aria-current={item === page ? 'page' : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    item === page
                      ? 'bg-ink text-white'
                      : 'text-gray-600 hover:bg-panel'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </section>
  );
}
