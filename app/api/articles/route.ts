import { NextRequest, NextResponse } from 'next/server';

import { getArticlesPresentation } from '@/lib/presenters/articles';
import { ARTICLE_CATEGORIES, type ArticleCategory } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Parse and validate the optional article category filter.
  const raw = req.nextUrl.searchParams.get('category');

  const category = ARTICLE_CATEGORIES.includes(raw as ArticleCategory)
    ? (raw as ArticleCategory)
    : undefined;

  // Parse the article limit and cap it at 50 results.
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get('limit') ?? 20) || 20,
    50,
  );

  // Fetch articles using the validated filters.
  return NextResponse.json(await getArticlesPresentation({ category, limit }));
}
