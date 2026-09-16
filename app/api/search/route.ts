import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { timeAgo } from '@/lib/format';
import {
  heroArticle,
  heroSideArticles,
  marketCards,
  latestNews,
} from '@/data/articles';
import { trendingTokens } from '@/data/tokens';
import { protocols } from '@/data/ecosystem';
import { learnGuides } from '@/data/learn';
import type { Article, ArticleCategory } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type SearchResult = {
  type: 'article' | 'token' | 'ecosystem' | 'learn';
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  href: string;
};

const RESULTS_PER_GROUP = 4;
const TOTAL_RESULTS = 10;

function dedupeById(list: Article[]): Article[] {
  const seen = new Set<string>();
  return list.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

const FALLBACK_ARTICLES: Article[] = dedupeById([
  heroArticle,
  ...heroSideArticles,
  ...marketCards,
  ...latestNews,
]);

function matches(haystack: string | undefined | null, query: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(query);
}

// Search published articles in the DB; fall back to the static sample set if the
// DB is empty or unreachable, mirroring the pattern used by the articles presenter.
async function searchArticles(query: string): Promise<SearchResult[]> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        status: 'published',
        OR: [
          { headline: { contains: query, mode: 'insensitive' } },
          { dek: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: RESULTS_PER_GROUP,
    });

    if (rows.length === 0) {
      return searchFallbackArticles(query);
    }

    return rows.map((a: any) => ({
      type: 'article' as const,
      id: a.id,
      title: a.headline,
      subtitle: timeAgo(a.publishedAt ?? a.generatedAt),
      category: a.category as ArticleCategory,
      href: `/news/${a.id}`,
    }));
  } catch {
    return searchFallbackArticles(query);
  }
}

function searchFallbackArticles(query: string): SearchResult[] {
  return FALLBACK_ARTICLES.filter(
    (a) => matches(a.headline, query) || matches(a.dek, query),
  )
    .slice(0, RESULTS_PER_GROUP)
    .map((a) => ({
      type: 'article' as const,
      id: a.id,
      title: a.headline,
      subtitle: a.category,
      category: a.category,
      href: a.href.startsWith('#') ? '/news' : a.href,
    }));
}

function searchTokens(query: string): SearchResult[] {
  return trendingTokens
    .filter((t) => matches(t.symbol, query) || matches(t.name, query))
    .slice(0, RESULTS_PER_GROUP)
    .map((t) => ({
      type: 'token' as const,
      id: t.id,
      title: `${t.symbol} — ${t.name}`,
      subtitle: t.price,
      href: '/tokens',
    }));
}

function searchEcosystem(query: string): SearchResult[] {
  return protocols
    .filter((p) => matches(p.name, query) || matches(p.description, query))
    .slice(0, RESULTS_PER_GROUP)
    .map((p) => ({
      type: 'ecosystem' as const,
      id: p.id,
      title: p.name,
      subtitle: p.description,
      href: '/ecosystem',
    }));
}

function searchLearn(query: string): SearchResult[] {
  return learnGuides
    .filter((g) => matches(g.title, query) || matches(g.dek, query))
    .slice(0, RESULTS_PER_GROUP)
    .map((g) => ({
      type: 'learn' as const,
      id: g.id,
      title: g.title,
      subtitle: g.dek,
      href: g.href,
    }));
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ query: q, results: [] });
  }

  const lower = q.toLowerCase();

  const [articles, tokens, ecosystem, learn] = await Promise.all([
    searchArticles(lower),
    Promise.resolve(searchTokens(lower)),
    Promise.resolve(searchEcosystem(lower)),
    Promise.resolve(searchLearn(lower)),
  ]);

  const results = [...articles, ...tokens, ...ecosystem, ...learn].slice(
    0,
    TOTAL_RESULTS,
  );

  return NextResponse.json({ query: q, results });
}
