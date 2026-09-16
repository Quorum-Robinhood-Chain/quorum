import { NextRequest, NextResponse } from 'next/server';
import { getArticlesPresentation } from '@/lib/presenters/articles';
import { ARTICLE_CATEGORIES, type ArticleCategory } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('category');
  const category = ARTICLE_CATEGORIES.includes(raw as ArticleCategory)
    ? (raw as ArticleCategory)
    : undefined;

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20) || 20, 50);

  return NextResponse.json(await getArticlesPresentation({ category, limit }));
}
