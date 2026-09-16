import { JsonRpcProvider, Contract } from 'ethers';

// ── Stock Tokens on Robinhood Chain (§7.2) ──────────────────────────────────
// CHAINLINK_FEED_MAP's addresses (confirmed against Robinhood's own Quicknode guide:
// https://www.quicknode.com/guides/robinhood/read-stock-tokens-data-onchain) are the
// Stock Tokens' own ERC-20 contracts on Robinhood Chain — e.g. AAPL -> 0xaF3D76f1834A...
// They are PLAIN ERC-20s (name/symbol/decimals/totalSupply/balanceOf + Transfer event).
// They do NOT implement Chainlink's AggregatorV3Interface, so the old latestRoundData()
// call here always failed — there is no on-chain price oracle exposed by the token itself.
//
// Since each Stock Token is issued 1:1 against the real underlying equity, its USD price
// IS the real stock's market price — not something read from the chain. We fetch that from
// Stooq (https://stooq.com), a free quote endpoint that needs no API key, and read the
// ERC-20 metadata directly from Robinhood Chain via RPC as a sanity check that the
// configured address is actually a live contract.
//
// Keeping the same exported function names/shapes as before so refresh.ts needs no changes.

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

// Stock Tokens are named "<TICKER>x" in this project's data (AAPLx, NVDAx, ...) but the
// real on-chain/market ticker has no "x" suffix — strip it before quoting.
function toUnderlyingTicker(symbol: string): string {
  return symbol.endsWith('x') ? symbol.slice(0, -1) : symbol;
}

function getFeedMap(): Record<string, string> {
  try {
    return JSON.parse(process.env.CHAINLINK_FEED_MAP || '{}');
  } catch {
    return {};
  }
}

function getProvider(): JsonRpcProvider {
  const rpcUrl = process.env.RHC_RPC_URL;
  if (!rpcUrl)
    throw new Error(
      'RHC_RPC_URL is not set — cannot read Stock Token contracts on-chain',
    );
  return new JsonRpcProvider(rpcUrl, Number(process.env.RHC_CHAIN_ID || 4663));
}

export interface StockTokenPrice {
  symbol: string;
  priceUsd: number | null;
  updatedAt: Date | null;
  error?: string;
}

/** Real-world quote for the underlying equity — no on-chain call, no API key required. */
async function fetchUnderlyingStockPrice(
  ticker: string,
): Promise<{ price: number | null; error?: string }> {
  try {
    const url = `https://stooq.com/q/l/?s=${ticker.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return { price: null, error: `Stooq HTTP ${res.status}` };

    const csv = (await res.text()).trim();
    const rows = csv.split('\n');
    if (rows.length < 2) return { price: null, error: 'Stooq: no data row' };

    // Header: Symbol,Date,Time,Open,High,Low,Close,Volume
    const cols = rows[1].split(',');
    const close = Number(cols[6]);
    if (!close || Number.isNaN(close))
      return { price: null, error: 'Stooq: no close price (bad ticker?)' };

    return { price: close };
  } catch (err) {
    return { price: null, error: (err as Error).message };
  }
}

/** Confirms the token contract is live on Robinhood Chain — sanity check only. A failed
 * call here means the configured address is wrong/unreachable, distinct from a bad quote. */
async function verifyOnchainContract(
  address: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const provider = getProvider();
    const token = new Contract(address, ERC20_ABI, provider);
    await token.decimals();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchStockTokenPrice(
  symbol: string,
): Promise<StockTokenPrice> {
  // CHAINLINK_FEED_MAP is keyed by the bare underlying ticker (e.g. "AAPL"), not the
  // project's DB symbol (e.g. "AAPLx") — strip the suffix before looking it up.
  const ticker = toUnderlyingTicker(symbol);
  const feedMap = getFeedMap();
  const address = feedMap[ticker] ?? feedMap[symbol];
  if (!address) {
    return {
      symbol,
      priceUsd: null,
      updatedAt: null,
      error: `no token contract address configured for "${ticker}"`,
    };
  }

  const onchain = await verifyOnchainContract(address);
  if (!onchain.ok) {
    return {
      symbol,
      priceUsd: null,
      updatedAt: null,
      error: `onchain: ${onchain.error}`,
    };
  }

  const { price, error } = await fetchUnderlyingStockPrice(ticker);
  if (price == null) {
    return {
      symbol,
      priceUsd: null,
      updatedAt: null,
      error: error ?? 'unknown error fetching stock price',
    };
  }

  return { symbol, priceUsd: price, updatedAt: new Date() };
}

export async function fetchStockTokenPrices(
  symbols: string[],
): Promise<StockTokenPrice[]> {
  return Promise.all(symbols.map(fetchStockTokenPrice));
}
