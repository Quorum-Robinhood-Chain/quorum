import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface PatchBody {
  action: "review" | "publish" | "reject" | "edit";
  headline?: string;
  body?: string;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const username = await requireAdminSession(req);
  if (!username) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = (await req.json().catch(() => null)) as PatchBody | null;
  if (!payload?.action) return NextResponse.json({ error: "missing action" }, { status: 400 });

  const editor = await prisma.editor.upsert({
    where: { username },
    update: {},
    create: { username, name: username, role: "editor" },
  });

  const existing = await prisma.article.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    let article;
    switch (payload.action) {
      case "edit":
        if (!payload.headline || !payload.body) {
          return NextResponse.json({ error: "headline and body required for edit" }, { status: 400 });
        }
        article = await prisma.article.update({
          where: { id: params.id },
          data: { headline: payload.headline, body: payload.body, edited: true },
        });
        break;

      case "review":
        article = await prisma.article.update({
          where: { id: params.id },
          data: { status: "reviewed", reviewedAt: new Date(), reviewerId: editor.id },
        });
        break;

      case "publish":
        article = await prisma.article.update({
          where: { id: params.id },
          data: { status: "published", publishedAt: new Date(), reviewerId: editor.id },
        });
        break;

      case "reject":
        article = await prisma.article.update({
          where: { id: params.id },
          data: { status: "rejected", reviewerId: editor.id },
        });
        break;

      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    return NextResponse.json({ article });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
