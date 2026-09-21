'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const JOBS = [
  { id: 'market', label: 'Refresh market data' },
  { id: 'ingest', label: 'Ingest sources' },
  { id: 'generate', label: 'Generate draft' },
  { id: 'trending-tokens-sync', label: 'Sync trending tokens' },
] as const;

type Feedback = { ok: boolean; text: string };

export default function TriggerJobsButton() {
  const router = useRouter();
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Run the selected admin job and handle the result.
  async function run(job: string) {
    setRunningJob(job);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        setFeedback({ ok: false, text: data.error ?? res.statusText });
      } else if (job === 'generate' && data.result?.skipped) {
        // generateArticle()'s skip shape: { skipped: true, template, reason }
        setFeedback({
          ok: false,
          text: `Skipped — not enough verified data (${data.result.template})`,
        });
      } else if (typeof data.result?.skipped === 'string') {
        setFeedback({ ok: false, text: `Skipped — ${data.result.skipped}` });
      } else {
        setFeedback({ ok: true, text: 'Job finished' });
        router.refresh();
      }
    } catch (err) {
      setFeedback({ ok: false, text: (err as Error).message });
    } finally {
      setRunningJob(null);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {/* Manual job trigger buttons */}
      {JOBS.map((job) => (
        <button
          key={job.id}
          onClick={() => run(job.id)}
          disabled={runningJob !== null}
          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-panel disabled:opacity-60"
        >
          {runningJob === job.id ? 'Running…' : job.label}
        </button>
      ))}

      {/* Display the latest job execution feedback */}
      {feedback && (
        <div
          className={`absolute right-0 top-full z-10 mt-1.5 w-64 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
            feedback.ok
              ? 'border-line bg-white text-olive'
              : 'border-red-200 bg-red-50 text-danger'
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}
