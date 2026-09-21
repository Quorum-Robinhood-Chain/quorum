import type { TokenCategory } from '@/types';
import { envJson } from '@/lib/env';
import { DEXSCREENER_CHAIN_SLUG } from './dexscreener';

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

  const poolAddress = poolAddressFor(token.symbol);

  if (poolAddress) {
    return `https://dexscreener.com/${DEXSCREENER_CHAIN_SLUG}/${poolAddress}`;
  }

  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(
    token.symbol,
  )}`;
}
