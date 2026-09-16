import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { getReviewQueuePresentation } from "@/lib/presenters/review-queue";
import { prisma } from "@/lib/db";
import ReviewQueueTable from "@/components/admin/ReviewQueueTable";
import LogoutButton from "@/components/admin/LogoutButton";
import TriggerJobsButton from "@/components/admin/TriggerJobsButton";

// Live data on every request — never served from the build-time cache.
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const username = await verifySessionToken(token);

  const { articles: reviewQueue, usingLiveData } = await getReviewQueuePresentation();

  // Fall back to the seeded source count (2: BeInCrypto + Coinfomania) if the DB isn't
  // reachable — same "sample data" degrade-gracefully convention as everything else here.
  let sourcesMonitored = 2;
  if (usingLiveData) {
    try {
      sourcesMonitored = await prisma.source.count();
    } catch {
      // keep the fallback
    }
  }

  const pending = reviewQueue.filter((a) => a.status === "draft").length;
  const publishedToday = reviewQueue.filter((a) => a.status === "published").length;
  const automatedShare = reviewQueue.length
    ? Math.round((reviewQueue.filter((a) => a.automated).length / reviewQueue.length) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-site items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-lime">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
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
            {username && <span className="text-xs text-gray-600">Signed in as {username}</span>}
            <a href="/" className="text-xs font-semibold text-olive hover:underline">
              View site
            </a>
            <TriggerJobsButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-site px-6 py-8">
        <h1 className="font-display text-2xl font-extrabold">Editorial review queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Human-in-the-loop review before automated drafts go live (dev-brief §8.5) — especially
          anything carrying specific numbers or token names.
        </p>
        {!usingLiveData && (
          <span className="mt-3 inline-block rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Sample data — no drafts generated yet, showing placeholder queue
          </span>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-card border border-line bg-white p-4">
            <div className="text-2xl font-extrabold text-ink">{pending}</div>
            <div className="mt-1 text-xs text-gray-600">Awaiting review</div>
          </div>
          <div className="rounded-card border border-line bg-white p-4">
            <div className="text-2xl font-extrabold text-ink">{publishedToday}</div>
            <div className="mt-1 text-xs text-gray-600">Published</div>
          </div>
          <div className="rounded-card border border-line bg-white p-4">
            <div className="text-2xl font-extrabold text-ink">{automatedShare}%</div>
            <div className="mt-1 text-xs text-gray-600">Automated-generated</div>
          </div>
          <div className="rounded-card border border-line bg-white p-4">
            <div className="text-2xl font-extrabold text-ink">{sourcesMonitored}</div>
            <div className="mt-1 text-xs text-gray-600">Sources monitored</div>
          </div>
        </div>

        <div className="mt-6">
          <ReviewQueueTable initialArticles={reviewQueue} usingLiveData={usingLiveData} />
        </div>

        <p className="mt-4 text-xs text-gray-400">
          {usingLiveData
            ? "Approve/reject/edit actions here call the real articles table (§10, §8.6)."
            : "No drafts in the database yet, so actions below only update local state for this demo — use the \"Trigger job\" button above (or POST /api/admin/trigger) to generate a draft and see it wired end to end."}
        </p>
      </main>
    </div>
  );
}
