import { prisma } from "@/lib/db/client";
import { timeAgo } from "@/lib/utils/format";
import { heroArticle, heroSideArticles, latestNews, marketCards } from "@/data/articles";
import type { Article, ArticleCategory, SourceAttribution } from "@/types";

const VALID_CATEGORIES: ArticleCategory[] = [
  "Markets",
  "Ecosystem",
  "Tokens",
  "Stock Tokens",
  "Security",
  "Learn",
];

const VALID_SOURCE_NAMES: SourceAttribution["name"][] = ["BeInCrypto", "Coinfomania", "Quorum"];

function toArticleCategory(raw: string): ArticleCategory {
  return (VALID_CATEGORIES as string[]).includes(raw) ? (raw as ArticleCategory) : "Markets";
}

function toSourceName(raw: string | undefined): SourceAttribution["name"] {
  return raw && (VALID_SOURCE_NAMES as string[]).includes(raw)
    ? (raw as SourceAttribution["name"])
    : "Quorum";
}

/** No separate `readTime` column — estimated from the dek at a slow, headline-style
 * words-per-minute so a one-line dek doesn't round down to "0 min read". */
function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 40));
  return `${minutes} min read`;
}

function dedupeById(list: Article[]): Article[] {
  const seen = new Set<string>();
  return list.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

const FALLBACK_ALL: Article[] = dedupeById([
  heroArticle,
  ...heroSideArticles,
  ...marketCards,
  ...latestNews,
]);

export interface ArticlesPresentation {
  articles: Article[];
  usingLiveData: boolean;
}

/**
 * Reads published articles from the DB — used by `app/api/articles/route.ts` and directly by
 * the homepage/Markets/Ecosystem/News server components (no self-fetch over HTTP, same
 * convention as the ticker/networkSnapshot presenters). Falls back to the static
 * `data/articles.ts` set — and says so via `usingLiveData` — whenever the DB has nothing
 * published yet or isn't reachable (§12: never show stale/fake data as live).
 */
export async function getArticlesPresentation(
  opts: { category?: ArticleCategory; limit?: number } = {},
): Promise<ArticlesPresentation> {
  const limit = opts.limit ?? 20;

  try {
    const rows = await prisma.article.findMany({
      where: { status: "published", ...(opts.category ? { category: opts.category } : {}) },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });

    if (rows.length === 0) {
      return { articles: fallbackSlice(opts.category, limit), usingLiveData: false };
    }

    const articles: Article[] = rows.map((a: any) => ({
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? "",
      desk: a.automated ? "Quorum Automated Desk" : (a.sourceNames[0] ?? "Quorum"),
      timeAgo: timeAgo(a.publishedAt ?? a.generatedAt),
      readTime: estimateReadTime(a.dek || a.headline),
      automated: a.automated,
      source: { name: toSourceName(a.sourceNames[0]), url: a.sourceUrls[0] ?? "#" },
      href: `/news/${a.id}`,
    }));

    return { articles, usingLiveData: true };
  } catch {
    // DB not reachable / not migrated yet — degrade to the static set rather than throwing.
    return { articles: fallbackSlice(opts.category, limit), usingLiveData: false };
  }
}

function fallbackSlice(category: ArticleCategory | undefined, limit: number): Article[] {
  const pool = category ? FALLBACK_ALL.filter((a) => a.category === category) : FALLBACK_ALL;
  return pool.slice(0, limit);
}

export interface HeroPresentation {
  hero: Article;
  side: Article[];
  usingLiveData: boolean;
}

/** Hero = most recently published article overall; side rail = the next few after it. There's
 * no separate "is this the hero" flag in the DB — recency is the whole signal, same as any
 * homepage "top story" slot would use. */
export async function getHeroPresentation(): Promise<HeroPresentation> {
  const { articles, usingLiveData } = await getArticlesPresentation({ limit: 4 });

  if (!usingLiveData || articles.length === 0) {
    return { hero: heroArticle, side: heroSideArticles, usingLiveData: false };
  }

  const [hero, ...side] = articles;
  return { hero, side, usingLiveData: true };
}

export interface ArticleDetail {
  id: string;
  category: ArticleCategory;
  headline: string;
  dek: string;
  body: string;
  desk: string;
  timeAgo: string;
  automated: boolean;
  sourceNames: string[];
  sourceUrls: string[];
}

/** Single published article for the /news/[id] detail page and app/api/articles/[id]. */
export async function getArticleById(id: string): Promise<ArticleDetail | null> {
  try {
    const a = await prisma.article.findUnique({ where: { id } });
    if (!a || a.status !== "published") return null;

    return {
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? "",
      body: a.body,
      desk: a.automated ? "Quorum Automated Desk" : (a.sourceNames[0] ?? "Quorum"),
      timeAgo: timeAgo(a.publishedAt ?? a.generatedAt),
      automated: a.automated,
      sourceNames: a.sourceNames,
      sourceUrls: a.sourceUrls,
    };
  } catch {
    return null;
  }
}
