import type { TokenCategory } from '@/types';
import { envJson } from '@/lib/env';
import { DEXSCREENER_CHAIN_SLUG } from './dexscreener';

// Where "learn more about this token" should send a reader, off-site.
//
// IMPORTANT: symbol/name are NOT a safe key for this. Anyone can deploy an
// ERC-20 on Robinhood Chain with any name/symbol, including copies of real
// projects — and even for legitimate projects, the same ticker can exist on
// several chains with completely different price/market data. A link built
// from `?query=SYMBOL` can silently resolve to the wrong asset. An on-chain
// address (contractAddress, or a TOKEN_POOL_MAP pool/pair address) is the
// only thing that reliably identifies a specific token/pair, so every
// DEX-style link here is built from one of those, never from symbol/name
// alone.
//
// - Stock Tokens are a wrapper around a real, listed equity — a live chart
//   for the underlying ticker is the most directly relevant reference, and
//   the ticker (e.g. "AAPL") is unambiguous, so these still go to
//   TradingView. Robinhood's own stock pages block a lot of traffic
//   (bot/region checks) and often fail to load for readers.
// - DeFi, meme and trending tokens: an on-chain address is NOT automatically
//   a Robinhood Chain address — several of the curated `defi` tokens are
//   bridged/wrapped assets whose contract genuinely lives on another chain
//   (Ethereum, Base, Solana, Arbitrum, Arc, ...). `chainSlug` on the Token
//   row records which chain contractAddress belongs to; a NULL chainSlug
//   means "robinhood" (every row from before this field existed — auto-
//   discovered `trending` tokens and TOKEN_POOL_MAP-configured `meme`
//   tokens, which are Robinhood-chain-native by construction). Preference
//   order for the address to link:
//     1. `contractAddress` on the Token row, with its `chainSlug` (defaults
//        to "robinhood" when unset).
//     2. TOKEN_POOL_MAP[symbol].pool — the pair contract address used for
//        pricing (see lib/market/refresh.ts). This is always a Robinhood
//        Chain address. Dexscreener's /{chain}/{addr} route accepts a pair
//        address directly, so this is a valid link even without a separate
//        contractAddress on file.
//   Whichever address is used, it links to that exact contract's page on
//   its own chain, e.g. https://dexscreener.com/robinhood/0x5eac... or
//   https://dexscreener.com/ethereum/0xfaa3...
// - Only when a token has neither on file do we fall back to a CoinGecko
//   name search — a last resort, since it carries the exact mismatch risk
//   described above. Fix this by adding a real contractAddress (+ chainSlug)
//   or a TOKEN_POOL_MAP entry for the symbol rather than relying on this
//   branch.

function poolAddressFor(symbol: string): string | null {
  try {
    const poolMap = envJson<{ pool: string }>('TOKEN_POOL_MAP');
    return poolMap[symbol]?.pool ?? null;
  } catch {
    return null;
  }
}

export function externalTokenUrl(token: {
  symbol: string;
  category: TokenCategory;
  contractAddress?: string | null;
  chainSlug?: string | null;
}): string {
  if (token.category === 'stock_token') {
    return `https://www.tradingview.com/symbols/${token.symbol}/`;
  }

  if (token.contractAddress) {
    const chain = token.chainSlug || DEXSCREENER_CHAIN_SLUG;
    return `https://dexscreener.com/${chain}/${token.contractAddress}`;
  }

  // No contractAddress on file — try the pool/pair address from
  // TOKEN_POOL_MAP instead. Every TOKEN_POOL_MAP entry is Robinhood-chain,
  // by construction (see lib/market/refresh.ts), so this one always uses
  // DEXSCREENER_CHAIN_SLUG rather than token.chainSlug.
  const poolAddress = poolAddressFor(token.symbol);

  if (poolAddress) {
    return `https://dexscreener.com/${DEXSCREENER_CHAIN_SLUG}/${poolAddress}`;
  }

  // Last-resort fallback for tokens with no on-chain address on file yet —
  // a name/symbol search, which can point at the wrong token. Prefer fixing
  // the data (add contractAddress + chainSlug, or a TOKEN_POOL_MAP entry)
  // over relying on this branch.
  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(
    token.symbol,
  )}`;
}
