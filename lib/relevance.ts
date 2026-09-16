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
