import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleById } from '@/lib/presenters/articles';

// Always fetch the latest article data on each request.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  // Fetch article data for dynamic page metadata.
  const article = await getArticleById(params.id);
  if (!article) return { title: 'Article not found — Quorum' };

  return {
    title: `${article.headline} — Quorum`,
    description: article.dek,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch the requested article by ID.
  const article = await getArticleById(params.id);
  if (!article) notFound();

  return (
    <main>
      {/* Financial disclaimer and site independence notice */}
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>

      {/* Article content and metadata */}
      <article className="mx-auto max-w-2xl px-6 py-9">
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-olive">
          {article.category}
        </span>

        <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink">
          {article.headline}
        </h1>

        {article.dek && (
          <p className="mt-3 text-base text-gray-600">{article.dek}</p>
        )}

        {/* Article attribution and publication details */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 border-b border-line pb-4 text-xs text-gray-400">
          ...
        </div>

        {/* Article body */}
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink">
          ...
        </div>

        {/* Financial disclaimer */}
        <p className="mt-8 text-xs text-gray-400">
          Not financial advice — nothing here is a recommendation to buy or
          sell.
        </p>
      </article>
    </main>
  );
}
