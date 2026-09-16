"use client";

import { Fragment, useState } from "react";
import { ReviewArticle, ArticleStatus } from "@/types";

const STATUS_STYLE: Record<ArticleStatus, string> = {
  draft: "bg-lime-tint text-olive",
  reviewed: "bg-panel text-gray-600 border border-line",
  published: "bg-ink text-lime",
};

type Action = "review" | "publish" | "reject" | "edit";

// When `usingLiveData` is true, every action PATCHes app/api/admin/review/[id]/route.ts (real
// DB writes, §8.6). When false (no drafts generated yet — sample/placeholder queue), there's no
// matching DB row to PATCH, so actions just update local state, same as the original demo.
export default function ReviewQueueTable({
  initialArticles,
  usingLiveData = false,
}: {
  initialArticles: ReviewArticle[];
  usingLiveData?: boolean;
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function applyLocal(id: string, action: Action, extra?: { headline: string; body: string }) {
    if (action === "reject") {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      return;
    }
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (action === "review") return { ...a, status: "reviewed" as ArticleStatus };
        if (action === "publish") return { ...a, status: "published" as ArticleStatus };
        if (action === "edit" && extra) {
          return { ...a, headline: extra.headline, body: extra.body, edited: true };
        }
        return a;
      }),
    );
  }

  async function mutate(id: string, action: Action, extra?: { headline: string; body: string }) {
    if (!usingLiveData) {
      applyLocal(id, action, extra);
      return;
    }

    setPendingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      applyLocal(id, action, extra);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(article: ReviewArticle) {
    setEditingId(article.id);
    setExpanded(article.id);
    setDraftHeadline(article.headline);
    setDraftBody(article.body);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    await mutate(id, "edit", { headline: draftHeadline, body: draftBody });
    setEditingId(null);
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {errorMsg && (
        <div className="border-b border-line bg-red-50 px-4 py-2 text-xs font-semibold text-danger">
          {errorMsg}
        </div>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-gray-600">
            <th className="px-4 py-3 font-semibold">Article</th>
            <th className="px-4 py-3 font-semibold">Template</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Generated</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => {
            const isEditing = editingId === article.id;
            const isPending = pendingId === article.id;
            return (
              <Fragment key={article.id}>
                <tr className="border-b border-line last:border-b-0">
                  <td className="max-w-sm px-4 py-3">
                    <button
                      className="text-left font-semibold text-ink hover:underline"
                      onClick={() => setExpanded((e) => (e === article.id ? null : article.id))}
                    >
                      {article.headline}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                      {article.automated ? (
                        <span className="rounded-full border border-line px-1.5 py-0.5">
                          {article.edited ? "Automated + Edited" : "Automated"}
                        </span>
                      ) : (
                        <span className="rounded-full border border-line px-1.5 py-0.5">
                          {article.edited ? "Curated + Edited" : "Curated"}
                        </span>
                      )}
                      <span>via {article.sources.join(", ")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{article.templateType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[article.status]}`}
                    >
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{article.generatedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {article.status !== "published" && (
                        <button
                          onClick={() => startEdit(article)}
                          disabled={isPending}
                          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-panel disabled:opacity-50"
                        >
                          Edit
                        </button>
                      )}
                      {article.status === "draft" && (
                        <button
                          onClick={() => mutate(article.id, "review")}
                          disabled={isPending}
                          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-panel disabled:opacity-50"
                        >
                          {isPending ? "Saving…" : "Mark reviewed"}
                        </button>
                      )}
                      {article.status !== "published" && (
                        <button
                          onClick={() => mutate(article.id, "publish")}
                          disabled={isPending}
                          className="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-lime hover:opacity-90 disabled:opacity-50"
                        >
                          {isPending ? "Saving…" : "Publish"}
                        </button>
                      )}
                      {article.status !== "published" && (
                        <button
                          onClick={() => mutate(article.id, "reject")}
                          disabled={isPending}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {expanded === article.id && (
                  <tr className="border-b border-line bg-panel/60 last:border-b-0">
                    <td colSpan={5} className="px-4 py-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label
                              htmlFor={`headline-${article.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                            >
                              Headline
                            </label>
                            <input
                              id={`headline-${article.id}`}
                              type="text"
                              value={draftHeadline}
                              onChange={(e) => setDraftHeadline(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-olive"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`body-${article.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                            >
                              Body
                            </label>
                            <textarea
                              id={`body-${article.id}`}
                              value={draftBody}
                              onChange={(e) => setDraftBody(e.target.value)}
                              rows={5}
                              className="mt-1 w-full resize-y rounded-lg border border-line px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-olive"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEdit}
                              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(article.id)}
                              disabled={pendingId === article.id}
                              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-lime hover:opacity-90 disabled:opacity-50"
                            >
                              {pendingId === article.id ? "Saving…" : "Save changes"}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">
                            {usingLiveData
                              ? "Saved to the articles table via PATCH /api/admin/review/[id]."
                              : "Sample data mode — saved locally only, no draft exists in the DB yet."}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Draft body
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                            {article.body}
                          </p>

                          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Generation inputs (audit trail — §12)
                          </div>
                          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-gray-600">
                            {article.generationInputs.map((input) => (
                              <li key={input} className="font-mono">
                                {input}
                              </li>
                            ))}
                          </ul>
                          {article.reviewerId && (
                            <div className="mt-2 text-xs text-gray-400">
                              Reviewed by{" "}
                              <span className="font-semibold text-ink">{article.reviewerId}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {articles.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                Queue is empty.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
