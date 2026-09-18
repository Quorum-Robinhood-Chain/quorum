import type { TokenCategory } from '@/types';

// Where "learn more about this token" should send a reader, off-site.
// Stock Tokens are a wrapper around a real, listed equity — a live chart for
// the underlying ticker is the most directly relevant reference. Robinhood's
// own stock pages block a lot of traffic (bot/region checks) and often fail
// to load for readers, so this points to TradingView instead, which is
// publicly accessible and covers the same tickers. DeFi/meme tokens have no
// equivalent equity chart, so those fall back to CoinGecko, a neutral
// third-party price reference.

// Stock Token symbols in this app follow the "<TICKER>x" convention
// (e.g. "AAPLx" for Apple) — strip the trailing "x" to get the real ticker.
function underlyingTicker(symbol: string): string {
  return symbol.replace(/x$/i, '');
}

export function externalTokenUrl(token: {
  symbol: string;
  category: TokenCategory;
}): string {
  if (token.category === 'stock_token') {
    return `https://www.tradingview.com/symbols/${underlyingTicker(token.symbol)}/`;
  }

  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(
    token.symbol,
  )}`;
}
