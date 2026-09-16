import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getReviewQueuePresentation } from "@/lib/presenters/review-queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const username = await requireAdminSession(req);
  if (!username) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { articles, usingLiveData } = await getReviewQueuePresentation();
  return NextResponse.json({ articles, usingLiveData });
}
