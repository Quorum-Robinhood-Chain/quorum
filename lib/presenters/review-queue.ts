import { prisma } from '@/lib/db';
import { timeAgo } from '@/lib/format';
import { reviewQueue as fallbackQueue } from '@/data/admin-review';
import type { ReviewArticle } from '@/types';

export interface ReviewQueuePresentation {
  articles: ReviewArticle[];
  usingLiveData: boolean;
}

// Fetch the latest articles available in the editorial review queue.
export async function getReviewQueuePresentation(): Promise<ReviewQueuePresentation> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: { in: ['published', 'unpublished'] } },
      // Flagged drafts surface first so an admin sees anything that needs a
      // look before scrolling past everything already fine.
      orderBy: [{ flagged: 'desc' }, { generatedAt: 'desc' }],
      take: 100,
      include: { reviewer: true },
    });

    if (rows.length === 0) {
      return {
        articles: fallbackQueue,
        usingLiveData: false,
      };
    }

    const articles: ReviewArticle[] = rows.map((a: any) => ({
      id: a.id,
      templateType: a.templateType,
      headline: a.headline,
      body: a.body,
      status: a.status,
      automated: a.automated,
      edited: a.edited,
      flagged: a.flagged,
      flagReason: a.flagReason,
      sources: a.sourceNames,
      generationInputs: a.generationInputs,
      generatedAt: timeAgo(a.generatedAt),
      reviewerId: a.reviewer?.username,
    }));

    return {
      articles,
      usingLiveData: true,
    };
  } catch {
    return {
      articles: fallbackQueue,
      usingLiveData: false,
    };
  }
}
