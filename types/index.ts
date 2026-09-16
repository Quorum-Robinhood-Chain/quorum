// Shared domain types, mirrors the dev-brief data model.

export type TickerItem = {
  /** e.g. "RHC TVL", "Stock Token Vol" */
  label: string;
  value: string;
  change: string;
  isUp: boolean;
};

// Single source of truth for article categories — the array is reused for runtime
// validation, the union for types. "Governance/Staking" deliberately absent (§2/§11).
export const ARTICLE_CATEGORIES = [
  "Markets",
  "Ecosystem",
  "Tokens",
  "Stock Tokens",
  "Security",
  "Learn",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];


export type SourceAttribution = {
  name: "BeInCrypto" | "Coinfomania" | "Quorum";
  url: string;
};

export type Article = {
  id: string;
  category: ArticleCategory;
  headline: string;
  dek: string;
  desk: string;
  timeAgo: string;
  readTime: string;
  automated: boolean;
  source: SourceAttribution;
  href: string;
};

export type TrendingItem = {
  rank: number;
  headline: string;
  category: ArticleCategory;
};

export type NetworkStat = {
  label: string;
  value: string;
  trend?: "up" | "down";
};

// Memecoins kept as a separate category, not mixed with Stock/DeFi.
export type TokenCategory = "stock_token" | "defi" | "meme";

export type TokenRow = {
  id: string;
  symbol: string;
  name: string;
  dex: string;
  category: TokenCategory;
  price: string;
  change24h: string;
  isUp: boolean;
  volume24h: string;
};

// Explainer content type, no live numbers needed.
export type LearnGuide = {
  id: string;
  title: string;
  dek: string;
  body: string;
  href: string;
};

// Protocol integrations/TVL — no governance token to vote/stake.
export type ProtocolCategory = "dex" | "lending" | "oracle";

export type ProtocolRow = {
  id: string;
  name: string;
  category: ProtocolCategory;
  description: string;
  tvl: string;
  change7d?: string;
  isUp?: boolean;
  url: string;
};

// Fields used by the /admin review queue, plus audit trail.
export type ArticleStatus = "draft" | "reviewed" | "published";

export type ReviewArticle = {
  id: string;
  templateType: string;
  headline: string;
  body: string;
  status: ArticleStatus;
  automated: boolean;
  edited?: boolean;
  sources: string[];
  generationInputs: string[];
  generatedAt: string;
  reviewerId?: string;
};
