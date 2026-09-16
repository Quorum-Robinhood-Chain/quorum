import Hero from '@/components/Hero';
import MarketsSection from '@/components/MarketsSection';
import NewsList from '@/components/NewsList';
import Sidebar from '@/components/Sidebar';
import CtaBanner from '@/components/CtaBanner';

// Always fetch live homepage data on each request.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      {/* Homepage hero section */}
      <Hero />

      {/* Financial disclaimer and site independence notice */}
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with
        Robinhood Markets, Inc.
      </div>

      {/* Market overview */}
      <MarketsSection />

      {/* Latest news and ecosystem sidebar */}
      <section className="wrap" id="ecosystem">
        <div className="content-grid">
          <NewsList />
          <Sidebar />
        </div>
      </section>

      {/* Call-to-action banner */}
      <CtaBanner />
    </main>
  );
}
