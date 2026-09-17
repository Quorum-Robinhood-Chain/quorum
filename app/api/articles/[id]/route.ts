import { NextRequest, NextResponse } from 'next/server';

import { getArticleById, getGatedArticleBody } from '@/lib/presenters/articles';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Fetch the requested article by ID. The body comes back empty while gated —
  // it is never included in this payload unless the gate check below passes.
  const article = await getArticleById(params.id);

  if (!article) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (!article.gated) {
    return NextResponse.json({ article });
  }

  // Gated article: re-verify server-side against the connected wallet address
  // (if any was supplied) before releasing the body. A wrong/missing/under-
  // balance address gets the teaser back plus a machine-readable reason so the
  // frontend can render the right prompt (connect wallet vs. top up balance).
  const address = req.nextUrl.searchParams.get('address');
  const gatedResult = await getGatedArticleBody(params.id, address);

  if (!gatedResult.ok) {
    return NextResponse.json(
      {
        article,
        gate: {
          error: gatedResult.error,
          detail: gatedResult.detail,
          required: gatedResult.required ?? article.requiredBalance,
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ article: { ...article, body: gatedResult.body } });
}
