'use client';

import { Fragment, useState } from 'react';
import { ReviewArticle, ArticleStatus } from '@/types';

const STATUS_STYLE: Record<ArticleStatus, string> = {
  draft: 'bg-lime-tint text-olive',
  reviewed: 'bg-panel text-gray-600 border border-line',
  published: 'bg-ink text-lime',
};

type Action = 'review' | 'publish' | 'reject' | 'edit';

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
      setArticles((prev) => prev.filter((a) => a.id !== id));
      return;
    }

    setArticles((prev) =>
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
                <tr className="border-b border-line last:border-b-0">...</tr>

                {/* Expanded article details and edit form */}
                {expanded === article.id && (
                  <tr className="border-b border-line bg-panel/60 last:border-b-0">
                    ...
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
