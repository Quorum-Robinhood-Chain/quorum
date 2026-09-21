import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { getReviewQueuePresentation } from '@/lib/presenters/review-queue';
import { prisma } from '@/lib/db';
import ReviewDashboard from '@/components/admin/ReviewDashboard';
import LogoutButton from '@/components/admin/LogoutButton';
import TriggerJobsButton from '@/components/admin/TriggerJobsButton';

// Always fetch live admin data on each request.
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Verify the current admin session and retrieve the username.
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const username = await verifySessionToken(token);

  // Fetch the current editorial review queue.
  const { articles: reviewQueue, usingLiveData } =
    await getReviewQueuePresentation();

  // Count monitored sources with a fallback for unavailable database access.
  let sourcesMonitored = 2;
  if (usingLiveData) {
    try {
      sourcesMonitored = await prisma.source.count();
    } catch {
      // Keep the default fallback value.
    }
  }

  return (
    <div className="min-h-screen">
      {/* Admin navigation and session controls */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-site items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-lime">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 12L12 4L20 12L12 20L4 12Z"
                  stroke="#0A0A0A"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.4" fill="#0A0A0A" />
              </svg>
            </span>

            <span className="font-display text-xl font-extrabold leading-none">
              Quorum <span className="text-gray-600">Admin</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {username && (
              <span className="text-xs text-gray-600">
                Signed in as {username}
              </span>
            )}

            <a
              href="/"
              className="text-xs font-semibold text-olive hover:underline"
            >
              View site
            </a>

            <TriggerJobsButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-site px-6 py-8">
        {/* Review queue overview */}
        <h1 className="font-display text-2xl font-extrabold">
          Moderation queue
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Every automated draft publishes immediately — nothing waits on
          approval. This is the safety net: flagged drafts (low data
          coverage, short body, missing dek) float to the top, and Unpublish
          is a one-click, reversible emergency takedown for anything that
          needs it.
        </p>

        {!usingLiveData && (
          <span className="mt-3 inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Sample data — no drafts generated yet, showing placeholder queue
          </span>
        )}

        {/* Summary cards + review table, kept in sync client-side */}
        <ReviewDashboard
          initialArticles={reviewQueue}
          usingLiveData={usingLiveData}
          sourcesMonitored={sourcesMonitored}
        />

        {/* Review queue status and demo information */}
        <p className="mt-4 text-xs text-gray-400">
          {usingLiveData
            ? 'Edit/flag/unpublish actions here call the real articles table (§10, §8.6).'
            : 'No drafts in the database yet, so actions below only update local state for this demo — use the "Trigger job" button above (or POST /api/admin/trigger) to generate a draft and see it wired end to end.'}
        </p>
      </main>
    </div>
  );
}
