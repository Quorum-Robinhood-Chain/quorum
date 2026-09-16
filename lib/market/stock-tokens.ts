import { Contract } from 'ethers';
import { getProvider, hasRpcConfigured } from './rpc';
import { env, envJson } from '@/lib/env';

const ERC20_ABI = ['function decimals() view returns (uint8)'];

// Convert a stock token symbol to its underlying ticker.
function toUnderlyingTicker(symbol: string): string {
  return symbol.endsWith('x') ? symbol.slice(0, -1) : symbol;
}

export interface StockTokenPrice {
  symbol: string;
  priceUsd: number | null;
  changePct24h: number | null;
  updatedAt: Date | null;
  error?: string;
  warning?: string;
}

interface FinnhubQuote {
  c?: number;
  dp?: number;
  t?: number;
}

// Fetch the underlying stock price and 24-hour change from Finnhub.
async function fetchUnderlyingPrice(ticker: string): Promise<{
  price: number | null;
  changePct: number | null;
  error?: string;
}> {
  const apiKey = env('FINNHUB_API_KEY');

  if (!apiKey) {
    return {
      price: null,
      changePct: null,
      error: 'FINNHUB_API_KEY not configured',
    };
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return {
        price: null,
        changePct: null,
        error: `Finnhub HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as FinnhubQuote;

    // Finnhub may return HTTP 200 with c: 0 for an unknown or unsupported symbol.
    if (!Number.isFinite(data.c) || data.c === 0) {
      return {
        price: null,
        changePct: null,
        error: `Finnhub: no quote for "${ticker}"`,
      };
    }

    return {
      price: data.c as number,
      changePct: Number.isFinite(data.dp) ? (data.dp as number) : null,
    };
  } catch (err) {
    return {
      price: null,
      changePct: null,
      error: (err as Error).message,
    };
  }
}

// Verify that the configured stock token contract is accessible on-chain.
async function verifyContract(
  address: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasRpcConfigured()) return { ok: true };

  try {
    await new Contract(address, ERC20_ABI, getProvider()).decimals();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Fetch the price and on-chain status for a single stock token.
export async function fetchStockTokenPrice(
  symbol: string,
): Promise<StockTokenPrice> {
  const ticker = toUnderlyingTicker(symbol);
  const contracts = envJson<string>('STOCK_TOKEN_MAP');
  const address = contracts[ticker] ?? contracts[symbol];

  if (!address) {
    return {
      symbol,
      priceUsd: null,
      changePct24h: null,
      updatedAt: null,
      error: `no contract configured for "${ticker}"`,
    };
  }

  const onchain = await verifyContract(address);
  const { price, changePct, error } = await fetchUnderlyingPrice(ticker);

  if (price == null) {
    return {
      symbol,
      priceUsd: null,
      changePct24h: null,
      updatedAt: null,
      error: onchain.ok
        ? error
        : `${error} (also: onchain check failed — ${onchain.error})`,
    };
  }

  return {
    symbol,
    priceUsd: price,
    changePct24h: changePct,
    updatedAt: new Date(),
    ...(onchain.ok
      ? {}
      : { warning: `onchain check failed — ${onchain.error}` }),
  };
}

// Fetch stock token prices in parallel.
export async function fetchStockTokenPrices(
  symbols: string[],
): Promise<StockTokenPrice[]> {
  return Promise.all(symbols.map(fetchStockTokenPrice));
}
