import { NextRequest, NextResponse } from "next/server";
import { getArticleById } from "@/lib/presenters/articles";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  if (!article) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ article });
}
