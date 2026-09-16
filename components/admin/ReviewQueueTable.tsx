'use client';

import { Fragment, useState } from 'react';
import { ReviewArticle, ArticleStatus } from '@/types';

const STATUS_STYLE: Record<ArticleStatus, string> = {
  draft: 'bg-lime-tint text-olive',
  reviewed: 'bg-panel text-gray-600 border border-line',
  published: 'bg-ink text-lime',
};

// Forward-only progression — an article can never move back a stage.
const STATUS_ORDER: ArticleStatus[] = ['draft', 'reviewed', 'published'];

type Action = 'review' | 'publish' | 'reject' | 'edit';

export default function ReviewQueueTable({
  articles,
  onArticlesChange,
  usingLiveData = false,
}: {
  articles: ReviewArticle[];
  onArticlesChange: (
    updater: ReviewArticle[] | ((prev: ReviewArticle[]) => ReviewArticle[]),
  ) => void;
  usingLiveData?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftHeadline, setDraftHeadline] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Apply article actions locally for sample data mode.
  function applyLocal(
    id: string,
    action: Action,
    extra?: { headline: string; body: string },
  ) {
    if (action === 'reject') {
      onArticlesChange((prev) => prev.filter((a) => a.id !== id));
      return;
    }

    onArticlesChange((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (action === 'review')
          return { ...a, status: 'reviewed' as ArticleStatus };
        if (action === 'publish')
          return { ...a, status: 'published' as ArticleStatus };
        if (action === 'edit' && extra) {
          return {
            ...a,
            headline: extra.headline,
            body: extra.body,
            edited: true,
          };
        }
        return a;
      }),
    );
  }

  // Send article actions to the API when live data is available.
  async function mutate(
    id: string,
    action: Action,
    extra?: { headline: string; body: string },
  ) {
    if (!usingLiveData) {
      applyLocal(id, action, extra);
      return;
    }

    setPendingId(id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/review/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  // Handle a status-dropdown change, refusing any backward move.
  function handleStatusChange(article: ReviewArticle, next: ArticleStatus) {
    const currentIndex = STATUS_ORDER.indexOf(article.status);
    const nextIndex = STATUS_ORDER.indexOf(next);

    if (nextIndex <= currentIndex) return; // no-op / blocked regression

    if (next === 'reviewed') {
      mutate(article.id, 'review');
    } else if (next === 'published') {
      mutate(article.id, 'publish');
    }
  }

  // Populate the edit form with the selected article.
  function startEdit(article: ReviewArticle) {
    setEditingId(article.id);
    setExpanded(article.id);
    setDraftHeadline(article.headline);
    setDraftBody(article.body);
  }

  // Close the article edit form without saving.
  function cancelEdit() {
    setEditingId(null);
  }

  // Save the edited article through the mutation handler.
  async function saveEdit(id: string) {
    await mutate(id, 'edit', { headline: draftHeadline, body: draftBody });
    setEditingId(null);
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {/* Display API errors above the review queue. */}
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
            const currentIndex = STATUS_ORDER.indexOf(article.status);

            return (
              <Fragment key={article.id}>
                {/* Review queue article row */}
                <tr className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(expanded === article.id ? null : article.id)
                      }
                      className="text-left font-medium text-ink hover:underline"
                    >
                      {article.headline}
                    </button>
                    {article.edited && (
                      <span className="ml-2 rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        Edited
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {article.templateType}
                  </td>
                  <td className="px-4 py-3">
                    {/* Status can only move forward: draft -> reviewed -> published. */}
                    <select
                      value={article.status}
                      disabled={isPending}
                      onChange={(e) =>
                        handleStatusChange(
                          article,
                          e.target.value as ArticleStatus,
                        )
                      }
                      aria-label={`Change status for ${article.headline}`}
                      className={`rounded-full px-2 py-1 text-xs font-semibold capitalize outline-none disabled:opacity-50 ${STATUS_STYLE[article.status]}`}
                    >
                      {STATUS_ORDER.map((status, index) => (
                        <option
                          key={status}
                          value={status}
                          disabled={index < currentIndex}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {article.generatedAt}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => startEdit(article)}
                        className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-panel disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => mutate(article.id, 'reject')}
                        className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded article details and edit form */}
                {expanded === article.id && (
                  <tr className="border-b border-line bg-panel/60 last:border-b-0">
                    <td colSpan={5} className="px-4 py-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <input
                            type="text"
                            value={draftHeadline}
                            onChange={(e) => setDraftHeadline(e.target.value)}
                            className="rounded-md border border-line px-3 py-2 text-sm font-medium"
                            placeholder="Headline"
                          />
                          <textarea
                            value={draftBody}
                            onChange={(e) => setDraftBody(e.target.value)}
                            rows={4}
                            className="rounded-md border border-line px-3 py-2 text-sm"
                            placeholder="Body"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => saveEdit(article.id)}
                              className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-lime hover:opacity-90 disabled:opacity-50"
                            >
                              Save changes
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-panel"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 text-sm">
                          <p className="text-gray-700">{article.body}</p>
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Sources:{' '}
                            </span>
                            <span className="text-xs text-gray-600">
                              {article.sources.join(', ')}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Generation inputs
                            </span>
                            <ul className="mt-1 list-disc pl-4 text-xs text-gray-600">
                              {article.generationInputs.map((input, i) => (
                                <li key={i}>{input}</li>
                              ))}
                            </ul>
                          </div>
                          {article.reviewerId && (
                            <p className="text-xs text-gray-500">
                              Reviewed by {article.reviewerId}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}

          {/* Empty review queue state */}
          {articles.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-gray-400"
              >
                Queue is empty.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
