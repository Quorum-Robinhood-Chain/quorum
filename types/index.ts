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
  'Markets',
  'Ecosystem',
  'Tokens',
  'Stock Tokens',
  'Security',
  'Learn',
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export type SourceAttribution = {
  name: 'BeInCrypto' | 'Coinfomania' | 'Quorum';
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
  /** True while the article is still inside the holder-only window (< 1 hour old).
   *  Omitted (falsy) on the static sample/fallback data, which is always public. */
  gated?: boolean;
};

export type TrendingItem = {
  rank: number;
  headline: string;
  category: ArticleCategory;
};

export type NetworkStat = {
  label: string;
  value: string;
  trend?: 'up' | 'down';
};

// Memecoins kept as a separate category, not mixed with Stock/DeFi.
// `trending` = auto-discovered via Dexscreener (lib/market/sync-trending-tokens.ts),
// as opposed to stock_token (Robinhood's own catalog) or defi/meme (hand-configured
// via TOKEN_POOL_MAP).
export type TokenCategory = 'stock_token' | 'defi' | 'meme' | 'trending';

export type TokenRow = {
  id: string;
  symbol: string;
  name: string;
  dex: string;
  category: TokenCategory;
  // On-chain contract address, when known. Symbols/names are not unique
  // (anyone can deploy a token called "Morpho" — see lib/market/dexscreener.ts),
  // so any off-site market link MUST key off this, not off symbol/name alone.
  // See lib/market/external-links.ts.
  contractAddress: string | null;
  price: string;
  change24h: string;
  isUp: boolean;
  volume24h: string;
};

// Explainer content type, no live numbers needed.
export type LearnGuide = {
  id: string;
  title: string;
  // Short label for compact spaces (e.g. the footer menu). Falls back to `title`.
  shortTitle?: string;
  dek: string;
  body: string;
  href: string;
};

// Protocol integrations/TVL — no governance token to vote/stake.
export type ProtocolCategory = 'dex' | 'lending' | 'oracle';

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

// Fields used by the /admin moderation queue, plus audit trail.
// Auto-publish model: every automated draft is `published` immediately.
// `unpublished` is the reversible emergency takedown an admin can apply.
export type ArticleStatus = 'published' | 'unpublished';

export type ReviewArticle = {
  id: string;
  templateType: string;
  headline: string;
  body: string;
  status: ArticleStatus;
  automated: boolean;
  edited?: boolean;
  flagged?: boolean;
  flagReason?: string | null;
  sources: string[];
  generationInputs: string[];
  generatedAt: string;
  reviewerId?: string;
};
