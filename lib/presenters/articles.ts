import { prisma } from '@/lib/db';
import { timeAgo, estimateReadTime } from '@/lib/format';
import {
  heroArticle,
  heroSideArticles,
  latestNews,
  marketCards,
} from '@/data/articles';
import {
  ARTICLE_CATEGORIES,
  type Article,
  type ArticleCategory,
  type SourceAttribution,
} from '@/types';

const VALID_SOURCE_NAMES: SourceAttribution['name'][] = [
  'BeInCrypto',
  'Coinfomania',
  'Quorum',
];

// Normalize an article category and fall back to Markets when invalid.
function toArticleCategory(raw: string): ArticleCategory {
  return ARTICLE_CATEGORIES.includes(raw as ArticleCategory)
    ? (raw as ArticleCategory)
    : 'Markets';
}

// Normalize a source name and fall back to Quorum when invalid.
function toSourceName(raw: string | undefined): SourceAttribution['name'] {
  return raw && (VALID_SOURCE_NAMES as string[]).includes(raw)
    ? (raw as SourceAttribution['name'])
    : 'Quorum';
}

// Remove duplicate articles while preserving their original order.
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

// Fetch published articles and fall back to sample data when live data is unavailable.
export async function getArticlesPresentation(
  opts: { category?: ArticleCategory; limit?: number } = {},
): Promise<ArticlesPresentation> {
  const limit = opts.limit ?? 20;

  try {
    const rows = await prisma.article.findMany({
      where: {
        status: 'published',
        ...(opts.category ? { category: opts.category } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    if (rows.length === 0) {
      return {
        articles: fallbackSlice(opts.category, limit),
        usingLiveData: false,
      };
    }

    const articles: Article[] = rows.map((a: any) => ({
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? '',
      desk: a.automated
        ? 'Quorum Automated Desk'
        : (a.sourceNames[0] ?? 'Quorum'),
      timeAgo: timeAgo(a.publishedAt ?? a.generatedAt),
      readTime: estimateReadTime(a.dek || a.headline),
      automated: a.automated,
      source: {
        name: toSourceName(a.sourceNames[0]),
        url: a.sourceUrls[0] ?? '#',
      },
      href: `/news/${a.id}`,
    }));

    return { articles, usingLiveData: true };
  } catch {
    return {
      articles: fallbackSlice(opts.category, limit),
      usingLiveData: false,
    };
  }
}

// Return fallback articles filtered by category and limited to the requested count.
function fallbackSlice(
  category: ArticleCategory | undefined,
  limit: number,
): Article[] {
  const pool = category
    ? FALLBACK_ALL.filter((a) => a.category === category)
    : FALLBACK_ALL;

  return pool.slice(0, limit);
}

export interface HeroPresentation {
  hero: Article;
  side: Article[];
  usingLiveData: boolean;
}

// Fetch the latest articles and prepare the homepage hero layout.
export async function getHeroPresentation(): Promise<HeroPresentation> {
  const { articles, usingLiveData } = await getArticlesPresentation({
    limit: 4,
  });

  if (!usingLiveData || articles.length === 0) {
    return {
      hero: heroArticle,
      side: heroSideArticles,
      usingLiveData: false,
    };
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

// Fetch a published article by ID and return its presentation data.
export async function getArticleById(
  id: string,
): Promise<ArticleDetail | null> {
  try {
    const a = await prisma.article.findUnique({ where: { id } });

    if (!a || a.status !== 'published') return null;

    return {
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? '',
      body: a.body,
      desk: a.automated
        ? 'Quorum Automated Desk'
        : (a.sourceNames[0] ?? 'Quorum'),
      timeAgo: timeAgo(a.publishedAt ?? a.generatedAt),
      automated: a.automated,
      sourceNames: a.sourceNames,
      sourceUrls: a.sourceUrls,
    };
  } catch {
    return null;
  }
}
