import { Suspense } from 'react';
import Hero from '@/components/Hero';
import MarketsSection from '@/components/MarketsSection';
import NewsList from '@/components/NewsList';
import Sidebar from '@/components/Sidebar';
import CtaBanner from '@/components/CtaBanner';
import Reveal from '@/components/motion/Reveal';

export const revalidate = 60;

export default function Home() {
  return (
    <main>
      {/* Homepage hero section — streams in independently so a slow query
          here doesn't block the rest of the page from appearing. */}
      <Suspense fallback={<div className="min-h-[420px]" />}>
        <Hero />
      </Suspense>

      {/* Financial disclaimer and site independence notice */}
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>

      {/* Market overview */}
      <Reveal>
        <Suspense fallback={<div className="min-h-[240px]" />}>
          <MarketsSection />
        </Suspense>
      </Reveal>

      {/* Latest news and ecosystem sidebar — each fetches its own data, so
          each gets its own boundary rather than blocking on the other. */}
      <Reveal>
        <section className="wrap" id="ecosystem">
          <div className="content-grid">
            <Suspense fallback={<div className="min-h-[480px]" />}>
              <NewsList />
            </Suspense>
            <Suspense fallback={<div className="min-h-[480px]" />}>
              <Sidebar />
            </Suspense>
          </div>
        </section>
      </Reveal>

      {/* Call-to-action banner */}
      <Reveal>
        <CtaBanner />
      </Reveal>
    </main>
  );
}
