import { LearnGuide } from "@/types";

// Learn guides — explainer content, low update frequency.
export const learnGuides: LearnGuide[] = [
  {
    id: "learn-1",
    title: "What is Robinhood Chain? The basics, explained",
    dek: "A permissionless, EVM-compatible Ethereum L2 (chain ID 4663) built on Arbitrum Orbit — what that actually means for users.",
    readTime: "6 min read",
    href: "#",
  },
  {
    id: "learn-2",
    title: "Stock Tokens vs. owning the underlying stock",
    dek: "Stock Tokens are ERC-20 instruments structured as debt securities that track US equities, settled in USDG — not direct equity ownership.",
    readTime: "7 min read",
    href: "#",
  },
  {
    id: "learn-3",
    title: "There's no \"RHC\" coin — here's how exposure actually works",
    dek: "Robinhood Chain has no native governance token. Economic exposure to the chain runs through HOOD, Robinhood's Nasdaq-listed equity.",
    readTime: "5 min read",
    href: "#",
  },
  {
    id: "learn-4",
    title: "How USDG lending on Morpho works",
    dek: "A plain-language walkthrough of the lending pool that's become the go-to USDG market on Robinhood Chain.",
    readTime: "5 min read",
    href: "#",
  },
];
