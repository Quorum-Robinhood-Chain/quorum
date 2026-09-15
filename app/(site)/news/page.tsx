import type { Metadata } from "next";
import NewsArchive from "@/components/NewsArchive";

export const metadata: Metadata = {
  title: "News — Quorum",
  description:
    "Every Robinhood Chain article from Quorum's automated desk and curated reporting, most recent first.",
};

export default function NewsPage() {
  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with Robinhood Markets,
        Inc.
      </div>
      <NewsArchive />
    </main>
  );
}
