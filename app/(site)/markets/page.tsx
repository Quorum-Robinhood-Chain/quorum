import type { Metadata } from "next";
import MarketsOverview from "@/components/MarketsOverview";

export const metadata: Metadata = {
  title: "Markets — Quorum",
  description:
    "Live TVL, DEX volume, and Stock Token activity across the Robinhood Chain ecosystem, pulled from real market and on-chain data.",
};

export default function MarketsPage() {
  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with Robinhood Markets,
        Inc.
      </div>
      <MarketsOverview />
    </main>
  );
}
