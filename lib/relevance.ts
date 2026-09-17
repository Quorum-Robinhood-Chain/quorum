// Keyword relevance gate for ingested items (§8.2). An embedding pass can be added
// later as a second gate without changing this interface.

const KEYWORDS = [
  'robinhood chain',
  'rh chain',
  'chain id 4663',
  'stock token',
  'stock tokens',
  'tokenized stock',
  'tokenized equit',
  'usdg',
];

// A story about Robinhood the brokerage shouldn't pass on the brand name alone.
const CHAIN_CONTEXT_TERMS = ['chain', 'on-chain', 'onchain', 'l2', 'layer 2', 'layer-2', 'defi', 'dex', 'token'];

export function isRobinhoodChainRelevant(title: string, excerpt?: string | null): boolean {
  const text = `${title} ${excerpt ?? ''}`.toLowerCase();

  if (KEYWORDS.some((keyword) => text.includes(keyword))) return true;
  if (text.includes('robinhood')) return CHAIN_CONTEXT_TERMS.some((term) => text.includes(term));
  return false;
}

// Broader gate for X/Twitter posts scraped via Apify (§ social_pulse template). Monitored accounts talk
// about the crypto market generally, not just Robinhood Chain by name — the point of
// pulling them in is ambient "market mood" context for MiMo, so this only needs to
// rule out posts that are obviously off-topic (personal chatter, unrelated news), not
// require an explicit Robinhood Chain mention the way the RSS gate does.
const MARKET_SIGNAL_TERMS = [
  'btc', 'bitcoin', 'eth', 'ethereum', 'crypto', 'defi', 'dex', 'l2', 'layer 2', 'layer-2',
  'altcoin', 'stablecoin', 'token', 'tvl', 'apy', 'airdrop', 'onchain', 'on-chain',
  'liquidity', 'market cap', 'trading volume', 'bull', 'bear', 'rally', 'dump', 'pump',
];
// A $TICKER (e.g. "$ARC") or a standalone percentage move (e.g. "+12%") is a strong
// signal on its own, even without a keyword match.
const TICKER_OR_PERCENT_PATTERN = /\$[a-z]{2,10}\b|[+-]?\d+(\.\d+)?%/i;

export function isMarketSignal(text: string): boolean {
  const lower = text.toLowerCase();
  if (MARKET_SIGNAL_TERMS.some((term) => lower.includes(term))) return true;
  return TICKER_OR_PERCENT_PATTERN.test(text);
}
