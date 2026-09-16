import { NextRequest, NextResponse } from "next/server";
import { getArticlesPresentation } from "@/lib/presenters/articles";
import type { ArticleCategory } from "@/types";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: ArticleCategory[] = [
  "Markets",
  "Ecosystem",
  "Tokens",
  "Stock Tokens",
  "Security",
  "Learn",
];

export async function GET(req: NextRequest) {
  const categoryParam = req.nextUrl.searchParams.get("category");
  const category =
    categoryParam && (VALID_CATEGORIES as string[]).includes(categoryParam)
      ? (categoryParam as ArticleCategory)
      : undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);

  const { articles, usingLiveData } = await getArticlesPresentation({ category, limit });
  return NextResponse.json({ articles, usingLiveData });
}
