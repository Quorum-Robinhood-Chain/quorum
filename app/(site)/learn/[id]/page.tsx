import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { learnGuides } from '@/data/learn';
import { paragraphs } from '@/lib/format';

// Static explainer content — no DB, so lookup is just a find over the data file
// (mirrors the shape of the /news/[id] route without the Prisma round-trip).
function getGuideById(id: string) {
  return learnGuides.find((g) => g.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const guide = getGuideById(params.id);
  if (!guide) return { title: 'Guide not found — Quorum' };

  return {
    title: `${guide.title} — Quorum Learn`,
    description: guide.dek,
  };
}

export default function LearnGuidePage({ params }: { params: { id: string } }) {
  const guide = getGuideById(params.id);
  if (!guide) notFound();

  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>

      <article className="mx-auto max-w-2xl px-6 py-9">
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-olive">
          Explainer
        </span>

        <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink">
          {guide.title}
        </h1>

        {guide.dek && (
          <p className="mt-3 text-base text-gray-600">{guide.dek}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-2 border-b border-line pb-4 text-xs text-gray-400">
          <span>Quorum Education Desk</span>
        </div>

        {/* Guide body — justified */}
        <div className="mt-6 space-y-7 text-justify text-[16px] leading-[1.75] text-ink">
          {paragraphs(guide.body).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Educational content — not financial advice.
        </p>
      </article>
    </main>
  );
}
