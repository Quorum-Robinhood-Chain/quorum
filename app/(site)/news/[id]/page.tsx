import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Bot, Newspaper, Clock, Lock } from 'lucide-react';
import { getArticleById } from '@/lib/presenters/articles';
import { paragraphs } from '@/lib/format';
import GatedArticleBody from '@/components/GatedArticleBody';

// Cache each article page for 30s. The actual gate check (wallet + $QUORUM
// balance) never relies on this cache — it's re-verified server-side on every
// call to /api/articles/[id] (force-dynamic, see that route). Worst case here
// is the public/gated badge on this page lags the real 1-hour cutoff by up to
// 30s, which is cosmetic, not a security boundary.
export const revalidate = 30;

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

        {/* Tokens mentioned in this article — link out to a trusted source:
            TradingView for Stock Tokens, Dexscreener (by contract address)
            otherwise. See lib/market/external-links.ts. */}
        {article.relatedTokens.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">Tokens in this story:</span>
            {article.relatedTokens.map((token) => (
              <a
                key={token.symbol}
                href={token.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-olive hover:bg-panel"
              >
                {token.symbol} →
              </a>
            ))}
          </div>
        )}

        {/* Article attribution and publication details */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line pb-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            {article.automated ? (
              <Bot
                className="h-3.5 w-3.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            ) : (
              <Newspaper
                className="h-3.5 w-3.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            )}
            {article.desk}
          </span>

          <span className="flex items-center gap-1">
            <Clock
              className="h-3.5 w-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {article.timeAgo}
          </span>

          {article.gated && (
            <span className="flex items-center gap-1 font-semibold text-olive">
              <Lock
                className="h-3.5 w-3.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              Holder-only · {article.requiredBalance.toLocaleString()} $QUORUM
              min
            </span>
          )}

          {article.sourceNames.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              via{' '}
              {article.sourceNames.map((name, i) => (
                <span key={`${name}-${i}`} className="flex items-center gap-1">
                  {article.sourceUrls[i] ? (
                    <a
                      href={article.sourceUrls[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-600"
                    >
                      {name}
                    </a>
                  ) : (
                    name
                  )}
                  {i < article.sourceNames.length - 1 && ','}
                </span>
              ))}
            </span>
          )}
        </div>

        {/* Article body — withheld server-side while gated (see getArticleById);
            GatedArticleBody re-fetches it client-side once a wallet clears the check. */}
        {article.gated ? (
          <GatedArticleBody
            articleId={article.id}
            requiredBalance={article.requiredBalance}
            minutesUntilUnlock={article.minutesUntilUnlock}
          />
        ) : (
          <div className="mt-6 space-y-7 text-justify text-[16px] leading-[1.75] text-ink">
            {paragraphs(article.body).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}

        {/* Financial disclaimer */}
        <p className="mt-8 text-xs text-gray-400">
          Not financial advice — nothing here is a recommendation to buy or
          sell.
        </p>
      </article>
    </main>
  );
}
