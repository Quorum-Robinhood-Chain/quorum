import { learnGuides } from '@/data/learn';

// Learn page: explainer content, not a live-data template.
export default function LearnSection() {
  return (
    <section className="mx-auto max-w-site px-6 pb-10" id="learn">
      {/* Learn section header */}
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-[18px] pt-9 mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink">Learn</h2>
        <a
          className="text-[13.5px] font-semibold text-olive hover:underline"
          href="#"
        >
          All guides
        </a>
      </div>

      {/* Educational guides */}
      <div className="grid gap-4 sm:grid-cols-2">
        {learnGuides.map((guide) => (
          <a
            key={guide.id}
            href={guide.href}
            className="group flex flex-col gap-2 rounded-card border border-line p-[18px] transition-colors hover:border-gray-400"
          >
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-olive">
              Explainer
            </span>
            <h3 className="text-[17px] font-bold leading-snug text-ink group-hover:underline">
              {guide.title}
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">{guide.dek}</p>
            <span className="mt-auto pt-2 text-xs text-gray-400">
              Quorum Education Desk
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
