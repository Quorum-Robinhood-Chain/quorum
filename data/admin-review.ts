import { ReviewArticle } from "@/types";

// Placeholder review queue with a generationInputs audit trail.
export const reviewQueue: ReviewArticle[] = [
  {
    id: "draft-1",
    templateType: "Top trending DEX tokens",
    headline: "MONEY IS MOVING: Robinhood Chain volume spikes 8% overnight",
    body:
      "24h volume across Arcus, Uniswap, 1inch and Lighter climbed past $9.2M, pushing Robinhood Chain to third among L2s by DEX activity. Morpho's USDG lending pool held near 6.9% APY as liquidity kept arriving.",
    status: "draft",
    automated: true,
    sources: ["DefiLlama", "Arcus subgraph", "Uniswap subgraph"],
    generationInputs: [
      "defillama:rhc-dex-volume-24h = $9.2M (+8.2%)",
      "arcus-subgraph:top-pairs snapshot 14:00 UTC",
    ],
    generatedAt: "6 minutes ago",
  },
  {
    id: "draft-2",
    templateType: "New token launches",
    headline: "JUST LAUNCHED: Three new tokens hit Robinhood Chain this hour",
    body:
      "Three new contracts deployed with initial liquidity added on Uniswap and 1inch in the last hour. Early volume is concentrated in one pair; the other two have yet to see meaningful trading.",
    status: "draft",
    automated: true,
    sources: ["Chain RPC (factory events)"],
    generationInputs: [
      "rpc:new-pair-created events, block range 4821000-4821240",
      "dexscreener:liquidity-added confirmations x3",
    ],
    generatedAt: "22 minutes ago",
  },
  {
    id: "draft-3",
    templateType: "Ecosystem roundup",
    headline: "Arcus deepens liquidity incentives to compete for volume",
    body:
      "The dYdX team's DEX is offering fee rebates to liquidity providers as new protocols race for early market share on Robinhood Chain. Original summary — not republished from the source.",
    status: "reviewed",
    automated: false,
    sources: ["BeInCrypto"],
    generationInputs: ["beincrypto:headline+excerpt, fetched 09:14 UTC", "original summary, not republished"],
    generatedAt: "1 hour ago",
    reviewerId: "j.rivera",
  },
  {
    id: "draft-4",
    templateType: "TVL & lending snapshot",
    headline: "Morpho's USDG pool becomes the go-to lending market on Robinhood Chain",
    body:
      "TVL in Morpho's USDG pool has grown steadily since launch, with APY holding near 7% through this week as more liquidity arrives from both retail and protocol treasuries.",
    status: "published",
    automated: true,
    sources: ["Morpho API", "DefiLlama"],
    generationInputs: ["morpho-api:usdg-pool tvl+apy snapshot", "defillama:rhc-tvl-total"],
    generatedAt: "2 hours ago",
    reviewerId: "j.rivera",
  },
  {
    id: "draft-5",
    templateType: "Stock Token movers",
    headline: "WALL STREET, ON-CHAIN: How tokenized stocks are trading right now",
    body:
      "Chainlink-fed prices for tokenized equities swung both ways today, with tech-linked Stock Tokens leading gains while the broader basket stayed roughly flat.",
    status: "published",
    automated: true,
    sources: ["Chainlink price feeds"],
    generationInputs: ["chainlink:stock-token feeds, 12 symbols, 13:00 UTC"],
    generatedAt: "3 hours ago",
    reviewerId: "a.chen",
  },
];
