import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/presenters/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const article = await getArticleById(params.id);
  if (!article) return { title: "Article not found — Quorum" };
  return { title: `${article.headline} — Quorum`, description: article.dek };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  if (!article) notFound();

  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with Robinhood Markets,
        Inc.
      </div>
      <article className="mx-auto max-w-2xl px-6 py-9">
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-olive">
          {article.category}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink">
          {article.headline}
        </h1>
        {article.dek && <p className="mt-3 text-base text-gray-600">{article.dek}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-2 border-b border-line pb-4 text-xs text-gray-400">
          <span>{article.desk}</span>
          <span>·</span>
          <span>{article.timeAgo}</span>
          {article.automated ? (
            <span className="ml-1 rounded-full bg-lime-tint px-2 py-0.5 font-semibold text-olive">
              Automated
            </span>
          ) : (
            article.sourceNames[0] &&
            article.sourceNames[0] !== "Quorum" && (
              <>
                <span>·</span>
                <span>
                  via{" "}
                  {article.sourceUrls[0] ? (
                    <a
                      className="hover:underline"
                      href={article.sourceUrls[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {article.sourceNames[0]}
                    </a>
                  ) : (
                    article.sourceNames[0]
                  )}
                </span>
              </>
            )
          )}
        </div>

        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink">
          {article.body
            .split(/\n+/)
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Not financial advice — nothing here is a recommendation to buy or sell.
        </p>
      </article>
    </main>
  );
}
