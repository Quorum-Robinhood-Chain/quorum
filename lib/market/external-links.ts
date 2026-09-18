import type { TokenCategory } from '@/types';
import { DEXSCREENER_CHAIN_SLUG } from './dexscreener';

// Where "learn more about this token" should send a reader, off-site.
//
// IMPORTANT: symbol/name are NOT a safe key for this. Anyone can deploy an
// ERC-20 on Robinhood Chain with any name/symbol, including copies of real
// projects (see the warning in lib/market/blockscout.ts) — and even for
// legitimate projects, the same ticker can exist on several chains with
// completely different price/market data. A link built from `?query=SYMBOL`
// can silently resolve to the wrong asset. The contract address is the only
// thing that reliably identifies a specific token, so every DEX-style link
// here is built from `contractAddress`, never from symbol/name alone.
//
// - Stock Tokens are a wrapper around a real, listed equity — a live chart
//   for the underlying ticker is the most directly relevant reference, and
//   the ticker (e.g. "AAPL") is unambiguous, so these still go to
//   TradingView. Robinhood's own stock pages block a lot of traffic
//   (bot/region checks) and often fail to load for readers.
// - DeFi, meme and trending tokens all live on Robinhood Chain and have a
//   known `contractAddress` (from TOKEN_POOL_MAP for defi/meme, or
//   Blockscout discovery for trending — see sync-trending-tokens.ts). These
//   link to that exact contract's page on Dexscreener, e.g.
//   https://dexscreener.com/robinhood/0x5eac...
// - Only when a token has no contractAddress on file do we fall back to a
//   CoinGecko name search — a last resort, since it carries the exact
//   mismatch risk described above.

export function externalTokenUrl(token: {
  symbol: string;
  category: TokenCategory;
  contractAddress?: string | null;
}): string {
  if (token.category === 'stock_token') {
    return `https://www.tradingview.com/symbols/${token.symbol}/`;
  }

  if (token.contractAddress) {
    return `https://dexscreener.com/${DEXSCREENER_CHAIN_SLUG}/${token.contractAddress}`;
  }

  // Last-resort fallback for tokens with no contract address on file yet —
  // a name/symbol search, which can point at the wrong token. Prefer fixing
  // the data (add the contractAddress) over relying on this branch.
  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(
    token.symbol,
  )}`;
}
