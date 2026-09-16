// Keyword relevance filter (§8.2: "filter for Robinhood Chain relevance
// (keyword + optional embedding-similarity filter)").
// This is the keyword pass — cheap, runs on every ingested item before it's stored
// as relevant. An embedding-similarity pass can be added later as a second gate
// without changing this interface.

const KEYWORDS = [
  "robinhood chain",
  "rh chain",
  "chain id 4663",
  "stock token",
  "stock tokens",
  "tokenized stock",
  "tokenized equit", // matches "equity"/"equities"
  "usdg",
];

// A story that only mentions Robinhood the brokerage (not the chain) shouldn't pass
// on its own — require either a strong phrase match, or "robinhood" plus an on-chain term.
const CHAIN_CONTEXT_TERMS = ["chain", "on-chain", "onchain", "l2", "layer 2", "layer-2", "defi", "dex", "token"];

export function isRobinhoodChainRelevant(title: string, excerpt?: string | null): boolean {
  const text = `${title} ${excerpt ?? ""}`.toLowerCase();

  if (KEYWORDS.some((kw) => text.includes(kw))) {
    return true;
  }

  if (text.includes("robinhood")) {
    return CHAIN_CONTEXT_TERMS.some((term) => text.includes(term));
  }

  return false;
}
