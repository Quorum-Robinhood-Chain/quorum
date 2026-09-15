"use client";

import { useMemo, useState } from "react";
import { newsArchive, newsCategories } from "@/data/news";
import { ArticleCategory } from "@/types";

// Full news archive with client-side category filter.
export default function NewsArchive() {
  const [active, setActive] = useState<ArticleCategory | "All">("All");

  const filtered = useMemo(
    () => (active === "All" ? newsArchive : newsArchive.filter((a) => a.category === active)),
    [active],
  );

  return (
    <section className="mx-auto max-w-site px-6 pb-10">
      <div className="border-b-2 border-ink pb-[18px] pt-9 mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">News</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Every article from Quorum&apos;s automated desk and curated reporting on Robinhood
          Chain, most recent first.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["All", ...newsCategories] as const).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active === category
                ? "border-ink bg-ink text-white"
                : "border-line text-gray-600 hover:border-gray-400"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="flex flex-col divide-y divide-line rounded-card border border-line">
        {filtered.map((article) => (
          <a
            key={article.id}
            href={article.href}
            className="flex flex-col gap-1.5 p-[18px] hover:bg-panel sm:flex-row sm:items-start sm:gap-5"
          >
            <div className="shrink-0 sm:w-28">
              <span className="text-[11px] font-bold uppercase tracking-wide text-olive">
                {article.category}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-bold leading-snug text-ink">{article.headline}</h3>
              {article.dek && (
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{article.dek}</p>
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
                  article.source.name !== "Quorum" && (
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

        {filtered.length === 0 && (
          <p className="p-[18px] text-sm text-gray-600">No articles in this category yet.</p>
        )}
      </div>
    </section>
  );
}
