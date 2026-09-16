import { JsonRpcProvider, Contract, Interface, type Log } from "ethers";

// Reads token price + 24h volume DIRECTLY from Robinhood Chain via RPC — no third-party
// subgraph/API needed. Works for any standard Uniswap V2-style pool (reserve-based AMM),
// which covers most DEXs on a new chain until/unless a hosted subgraph exists.
//
// Configure via TOKEN_POOL_MAP env var, JSON: symbol -> pool config, e.g.
//   TOKEN_POOL_MAP={"ARC":{"pool":"0xPoolAddr","tokenIsBase":true,"quoteDecimals":6,"baseDecimals":18}}
// Get pool addresses from Robinhood Chain's block explorer (RHC_BLOCK_EXPLORER_API_URL) —
// search the token's contract address, find its liquidity pool / pair.

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

const SWAP_IFACE = new Interface([
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
]);

export interface PoolConfig {
  pool: string;
  // true if the tracked token is token0 in the pair; false if token1.
  tokenIsToken0: boolean;
  tokenDecimals: number;
  quoteDecimals: number;
  // USD price of the quote-side token (e.g. 1 for a USD stablecoin quote pair).
  quoteUsdPrice: number;
}

function getPoolMap(): Record<string, PoolConfig> {
  try {
    return JSON.parse(process.env.TOKEN_POOL_MAP || "{}");
  } catch {
    return {};
  }
}

function getProvider(): JsonRpcProvider {
  const rpcUrl = process.env.RHC_RPC_URL;
  if (!rpcUrl) throw new Error("RHC_RPC_URL is not set — cannot read pools on-chain");
  return new JsonRpcProvider(rpcUrl, Number(process.env.RHC_CHAIN_ID || 4663));
}

export interface OnchainTokenSnapshot {
  symbol: string;
  priceUsd: number | null;
  volume24hUsd: number | null;
  error?: string;
}

/** Blocks-per-24h estimate; override with RHC_BLOCKS_PER_DAY once real block time is known. */
function blocksPerDay(): number {
  return Number(process.env.RHC_BLOCKS_PER_DAY || 43200); // assumes ~2s blocks by default
}

export async function fetchOnchainTokenSnapshot(symbol: string): Promise<OnchainTokenSnapshot> {
  const cfg = getPoolMap()[symbol];
  if (!cfg) {
    return { symbol, priceUsd: null, volume24hUsd: null, error: "no pool configured in TOKEN_POOL_MAP" };
  }

  try {
    const provider = getProvider();
    const pair = new Contract(cfg.pool, PAIR_ABI, provider);
    const [reserve0, reserve1] = await pair.getReserves();

    const tokenReserve = Number(cfg.tokenIsToken0 ? reserve0 : reserve1) / 10 ** cfg.tokenDecimals;
    const quoteReserve = Number(cfg.tokenIsToken0 ? reserve1 : reserve0) / 10 ** cfg.quoteDecimals;
    const priceUsd = tokenReserve > 0 ? (quoteReserve / tokenReserve) * cfg.quoteUsdPrice : null;

    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - blocksPerDay());
    const logs: Log[] = await provider.getLogs({
      address: cfg.pool,
      fromBlock,
      toBlock: latest,
      topics: [SWAP_IFACE.getEvent("Swap")!.topicHash],
    });

    let volumeQuoteUnits = 0;
    for (const log of logs) {
      const parsed = SWAP_IFACE.parseLog(log);
      if (!parsed) continue;
      const quoteIn = cfg.tokenIsToken0 ? parsed.args.amount1In : parsed.args.amount0In;
      const quoteOut = cfg.tokenIsToken0 ? parsed.args.amount1Out : parsed.args.amount0Out;
      volumeQuoteUnits += Number(quoteIn) + Number(quoteOut);
    }
    const volume24hUsd = (volumeQuoteUnits / 10 ** cfg.quoteDecimals) * cfg.quoteUsdPrice;

    return { symbol, priceUsd, volume24hUsd };
  } catch (err) {
    return { symbol, priceUsd: null, volume24hUsd: null, error: (err as Error).message };
  }
}

export async function fetchOnchainTokenSnapshots(symbols: string[]): Promise<OnchainTokenSnapshot[]> {
  return Promise.all(symbols.map(fetchOnchainTokenSnapshot));
}
