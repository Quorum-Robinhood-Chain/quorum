import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { reviewQueue as fallbackQueue } from "@/data/admin-review";
import type { ReviewArticle } from "@/types";

export interface ReviewQueuePresentation {
  articles: ReviewArticle[];
  usingLiveData: boolean;
}

/**
 * Reads draft/reviewed/published articles for the admin review queue (§8.5). Used by
 * `app/api/admin/review/route.ts` and directly by the `/admin` server component. Falls back to
 * the static `data/admin-review.ts` set — flagged via `usingLiveData` — whenever nothing's been
 * generated yet or the DB isn't reachable, so the demo UI still has something to show.
 */
export async function getReviewQueuePresentation(): Promise<ReviewQueuePresentation> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: { in: ["draft", "reviewed", "published"] } },
      orderBy: { generatedAt: "desc" },
      take: 100,
      include: { reviewer: true },
    });

    if (rows.length === 0) {
      return { articles: fallbackQueue, usingLiveData: false };
    }

    const articles: ReviewArticle[] = rows.map((a: any) => ({
      id: a.id,
      templateType: a.templateType,
      headline: a.headline,
      body: a.body,
      status: a.status,
      automated: a.automated,
      edited: a.edited,
      sources: a.sourceNames,
      generationInputs: a.generationInputs,
      generatedAt: timeAgo(a.generatedAt),
      reviewerId: a.reviewer?.username,
    }));

    return { articles, usingLiveData: true };
  } catch {
    return { articles: fallbackQueue, usingLiveData: false };
  }
}
