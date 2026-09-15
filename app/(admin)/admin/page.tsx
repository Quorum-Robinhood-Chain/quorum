import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { reviewQueue } from "@/data/admin-review";
import ReviewQueueTable from "@/components/admin/ReviewQueueTable";
import LogoutButton from "@/components/admin/LogoutButton";

export default async function AdminDashboardPage() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const username = await verifySessionToken(token);

  const pending = reviewQueue.filter((a) => a.status === "draft").length;
  const publishedToday = reviewQueue.filter((a) => a.status === "published").length;
  const automatedShare = Math.round(
    (reviewQueue.filter((a) => a.automated).length / reviewQueue.length) * 100
  );

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
            <div className="text-2xl font-extrabold text-ink">2</div>
            <div className="mt-1 text-xs text-gray-600">Sources monitored</div>
          </div>
        </div>

        <div className="mt-6">
          <ReviewQueueTable initialArticles={reviewQueue} />
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Approve/reject actions here are local-state only for this demo — wire them to real
          PATCH/POST calls against the articles table (§10, §8.6) before launch.
        </p>
      </main>
    </div>
  );
}
