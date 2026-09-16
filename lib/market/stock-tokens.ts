import { Contract } from 'ethers';
import { getProvider, hasRpcConfigured } from './rpc';
import { envJson } from '@/lib/env';

/**
 * Stock Token pricing (§7.2).
 *
 * STOCK_TOKEN_MAP holds each Stock Token's own ERC-20 contract on Robinhood Chain
 * (e.g. AAPL -> 0xaF3D…). These are plain ERC-20s — they do NOT implement Chainlink's
 * AggregatorV3Interface, so there is no `latestRoundData()` to read.
 *
 * Each token is issued 1:1 against the real underlying equity, so its USD price is the
 * real stock's market price. That quote comes from Stooq (free, no key); the on-chain
 * call is only a sanity check that the configured address is a live contract.
 */

const ERC20_ABI = ['function decimals() view returns (uint8)'];

/** Project symbols carry an "x" suffix (AAPLx); the market ticker does not. */
function toUnderlyingTicker(symbol: string): string {
  return symbol.endsWith('x') ? symbol.slice(0, -1) : symbol;
}

export interface StockTokenPrice {
  symbol: string;
  priceUsd: number | null;
  updatedAt: Date | null;
  error?: string;
}

async function fetchUnderlyingPrice(ticker: string): Promise<{ price: number | null; error?: string }> {
  try {
    const url = `https://stooq.com/q/l/?s=${ticker.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { price: null, error: `Stooq HTTP ${res.status}` };

    // Header row then: Symbol,Date,Time,Open,High,Low,Close,Volume
    const rows = (await res.text()).trim().split('\n');
    if (rows.length < 2) return { price: null, error: 'Stooq: no data row' };

    const close = Number(rows[1].split(',')[6]);
    if (!Number.isFinite(close) || close === 0) return { price: null, error: 'Stooq: no close price' };
    return { price: close };
  } catch (err) {
    return { price: null, error: (err as Error).message };
  }
}

/** Confirms the configured address is a live contract — distinguishes bad config from a bad quote. */
async function verifyContract(address: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasRpcConfigured()) return { ok: true }; // no RPC configured: skip the check, don't fail the price
  try {
    await new Contract(address, ERC20_ABI, getProvider()).decimals();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchStockTokenPrice(symbol: string): Promise<StockTokenPrice> {
  const ticker = toUnderlyingTicker(symbol);
  const contracts = envJson<string>('STOCK_TOKEN_MAP');
  const address = contracts[ticker] ?? contracts[symbol];

  if (!address) {
    return { symbol, priceUsd: null, updatedAt: null, error: `no contract configured for "${ticker}"` };
  }

  const onchain = await verifyContract(address);
  if (!onchain.ok) return { symbol, priceUsd: null, updatedAt: null, error: `onchain: ${onchain.error}` };

  const { price, error } = await fetchUnderlyingPrice(ticker);
  if (price == null) return { symbol, priceUsd: null, updatedAt: null, error };

  return { symbol, priceUsd: price, updatedAt: new Date() };
}

export async function fetchStockTokenPrices(symbols: string[]): Promise<StockTokenPrice[]> {
  return Promise.all(symbols.map(fetchStockTokenPrice));
}
