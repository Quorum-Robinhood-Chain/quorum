import type { Metadata } from "next";
import EcosystemGrid from "@/components/EcosystemGrid";

export const metadata: Metadata = {
  title: "Ecosystem — Quorum",
  description:
    "Protocol integrations, TVL, and new deployments on Robinhood Chain — Arcus, Uniswap, 1inch, Lighter, Morpho, and Chainlink.",
};

export default function EcosystemPage() {
  return (
    <main>
      <div className="disclaimer-strip">
        Not financial advice. Quorum is independent and not affiliated with Robinhood Markets,
        Inc.
      </div>
      <EcosystemGrid />
    </main>
  );
}
