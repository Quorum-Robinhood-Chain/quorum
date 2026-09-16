import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

interface PatchBody {
  action: 'review' | 'publish' | 'reject' | 'edit';
  headline?: string;
  body?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Verify the admin session before allowing article changes.
  const username = await requireAdminSession(req);
  if (!username)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Validate the requested article action and payload.
  const payload = (await req.json().catch(() => null)) as PatchBody | null;
  if (!payload?.action)
    return NextResponse.json({ error: 'missing action' }, { status: 400 });

  // Create or retrieve the editor performing the action.
  const editor = await prisma.editor.upsert({
    where: { username },
    update: {},
    create: { username, name: username, role: 'editor' },
  });

  // Ensure the requested article exists.
  const existing = await prisma.article.findUnique({
    where: { id: params.id },
  });
  if (!existing)
    return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    let article;

    // Apply the requested editorial action.
    switch (payload.action) {
      case 'edit':
        if (!payload.headline || !payload.body) {
          return NextResponse.json(
            { error: 'headline and body required for edit' },
            { status: 400 },
          );
        }

        article = await prisma.article.update({
          where: { id: params.id },
          data: {
            headline: payload.headline,
            body: payload.body,
            edited: true,
          },
        });
        break;

      case 'review':
        article = await prisma.article.update({
          where: { id: params.id },
          data: {
            status: 'reviewed',
            reviewedAt: new Date(),
            reviewerId: editor.id,
          },
        });
        break;

      case 'publish':
        article = await prisma.article.update({
          where: { id: params.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            reviewerId: editor.id,
          },
        });
        break;

      case 'reject':
        article = await prisma.article.update({
          where: { id: params.id },
          data: {
            status: 'rejected',
            reviewerId: editor.id,
          },
        });
        break;

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }

    // Return the updated article to the admin client.
    return NextResponse.json({ article });
  } catch (err) {
    // Return database or update errors to the client.
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
