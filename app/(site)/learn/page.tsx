import type { Metadata } from "next";
import LearnSection from "@/components/LearnSection";

export const metadata: Metadata = {
  title: "Learn — Quorum",
  description:
    "Plain-language explainers on Robinhood Chain: Stock Tokens, USDG lending, and why there's no native governance token.",
};

export default function LearnPage() {
  return (
    <main>
      <LearnSection />
    </main>
  );
}
