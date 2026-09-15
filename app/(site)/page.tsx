import Hero from "@/components/Hero";
import MarketsSection from "@/components/MarketsSection";
import NewsList from "@/components/NewsList";
import Sidebar from "@/components/Sidebar";
import CtaBanner from "@/components/CtaBanner";

export default function Home() {
  return (
    <main>
      <Hero />

      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with Robinhood Markets,
        Inc.
      </div>

      <MarketsSection />

      <section className="wrap" id="ecosystem">
        <div className="content-grid">
          <NewsList />
          <Sidebar />
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
