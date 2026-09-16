'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TriggerJobsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  async function handleTrigger() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Session cookie is sent automatically for this same-origin request —
        // no x-cron-secret needed here, that header is only for the external scheduler.
        body: JSON.stringify({ job: 'generate' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setFeedback({
          ok: false,
          text: `Gagal: ${data.error ?? res.statusText}`,
        });
      } else if (data.result?.skipped) {
        setFeedback({
          ok: false,
          text: `Dilewati: belum ada cukup data terverifikasi (template: ${data.result.template})`,
        });
      } else {
        setFeedback({ ok: true, text: 'Artikel berhasil dibuat' });
        router.refresh();
      }
    } catch (err) {
      setFeedback({ ok: false, text: `Gagal: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleTrigger}
        disabled={loading}
        className="rounded-lg border border-line bg-lime px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-lime/80 disabled:opacity-60"
      >
        {loading ? 'Membuat artikel…' : 'Buat artikel'}
      </button>

      {feedback && (
        <div
          className={`absolute right-0 z-10 mt-1.5 w-56 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
            feedback.ok
              ? 'border-line bg-white text-olive'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}
