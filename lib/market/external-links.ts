import type { TokenCategory } from '@/types';

// Where "learn more about this token" should send a reader, off-site.
// Stock Tokens are a wrapper around a real, listed equity — a live chart for
// the underlying ticker is the most directly relevant reference. Robinhood's
// own stock pages block a lot of traffic (bot/region checks) and often fail
// to load for readers, so this points to TradingView instead, which is
// publicly accessible and covers the same tickers. DeFi/meme tokens have no
// equivalent equity chart, so those fall back to CoinGecko, a neutral
// third-party price reference. Trending tokens are auto-discovered straight
// off Robinhood Chain via Blockscout (see sync-trending-tokens.ts) — these
// point to the token's own Robinhood crypto page.

// Stock Token symbols now come straight from Robinhood's own catalog
// (lib/market/robinhood-assets.ts) as bare tickers, e.g. "AAPL" -- no
// transformation needed to get the real ticker.

export function externalTokenUrl(token: {
  symbol: string;
  category: TokenCategory;
}): string {
  if (token.category === 'stock_token') {
    return `https://www.tradingview.com/symbols/${token.symbol}/`;
  }

  if (token.category === 'trending') {
    return `https://www.coingecko.com/en/search?query=${encodeURIComponent(
      token.symbol,
    )}`;
  }

  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(
    token.symbol,
  )}`;
}
