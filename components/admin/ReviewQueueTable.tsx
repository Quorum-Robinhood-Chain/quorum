'use client';

import { Fragment, useState } from 'react';
import { ReviewArticle, ArticleStatus } from '@/types';

const STATUS_STYLE: Record<ArticleStatus, string> = {
  published: 'bg-ink text-lime',
  unpublished: 'bg-panel text-danger border border-line',
};

type Action = 'edit' | 'flag' | 'unflag' | 'unpublish' | 'republish';

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
    onArticlesChange((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (action === 'flag')
          return { ...a, flagged: true, flagReason: 'flagged by admin' };
        if (action === 'unflag')
          return { ...a, flagged: false, flagReason: null };
        if (action === 'unpublish')
          return { ...a, status: 'unpublished' as ArticleStatus };
        if (action === 'republish')
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
                    {article.flagged && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {article.templateType}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[article.status]}`}
                    >
                      {article.status}
                    </span>
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

                      {article.flagged ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => mutate(article.id, 'unflag')}
                          className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-panel disabled:opacity-50"
                        >
                          Unflag
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => mutate(article.id, 'flag')}
                          className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-panel disabled:opacity-50"
                        >
                          Flag
                        </button>
                      )}

                      {article.status === 'published' ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => mutate(article.id, 'unpublish')}
                          className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => mutate(article.id, 'republish')}
                          className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-lime hover:opacity-90 disabled:opacity-50"
                        >
                          Republish
                        </button>
                      )}
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
                          {article.flagged && article.flagReason && (
                            <p className="text-xs font-semibold text-amber-800">
                              Flag reason: {article.flagReason}
                            </p>
                          )}
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
                              Last touched by {article.reviewerId}
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
