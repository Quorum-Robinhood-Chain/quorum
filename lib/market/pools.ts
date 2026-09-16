import { Contract, Interface, type Log } from 'ethers';
import { getProvider, hasRpcConfigured } from './rpc';
import { envJson, envNumber } from '@/lib/env';

/**
 * Reads token price + 24h volume straight off Robinhood Chain via RPC — no third-party
 * subgraph required, which matters on a chain that indexers may not cover yet.
 *
 * Works with any Uniswap V2-style (reserve-based) pool. Configure via TOKEN_POOL_MAP:
 *   TOKEN_POOL_MAP={"ARC":{"pool":"0x…","tokenIsToken0":true,"tokenDecimals":18,"quoteDecimals":6,"quoteUsdPrice":1}}
 * Pool addresses come from the block explorer: look up the token, find its pair.
 */

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

const SWAP_IFACE = new Interface([
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
]);

export interface PoolConfig {
  pool: string;
  tokenIsToken0: boolean; // true when the tracked token is token0 in the pair
  tokenDecimals: number;
  quoteDecimals: number;
  quoteUsdPrice: number; // USD price of the quote side (1 for a USD stablecoin)
}

export interface OnchainTokenSnapshot {
  symbol: string;
  priceUsd: number | null;
  volume24hUsd: number | null;
  error?: string;
}

export async function fetchOnchainTokenSnapshot(symbol: string): Promise<OnchainTokenSnapshot> {
  const config = envJson<PoolConfig>('TOKEN_POOL_MAP')[symbol];
  if (!config) return { symbol, priceUsd: null, volume24hUsd: null, error: 'no pool in TOKEN_POOL_MAP' };
  if (!hasRpcConfigured()) return { symbol, priceUsd: null, volume24hUsd: null, error: 'RHC_RPC_URL not set' };

  try {
    const provider = getProvider();
    const [reserve0, reserve1] = await new Contract(config.pool, PAIR_ABI, provider).getReserves();

    const tokenReserve = Number(config.tokenIsToken0 ? reserve0 : reserve1) / 10 ** config.tokenDecimals;
    const quoteReserve = Number(config.tokenIsToken0 ? reserve1 : reserve0) / 10 ** config.quoteDecimals;
    const priceUsd = tokenReserve > 0 ? (quoteReserve / tokenReserve) * config.quoteUsdPrice : null;

    // Sum swap volume over roughly the last 24h of blocks.
    const latest = await provider.getBlockNumber();
    const logs: Log[] = await provider.getLogs({
      address: config.pool,
      fromBlock: Math.max(0, latest - envNumber('RHC_BLOCKS_PER_DAY', 43200)),
      toBlock: latest,
      topics: [SWAP_IFACE.getEvent('Swap')!.topicHash],
    });

    let quoteUnits = 0;
    for (const log of logs) {
      const parsed = SWAP_IFACE.parseLog(log);
      if (!parsed) continue;
      const quoteIn = config.tokenIsToken0 ? parsed.args.amount1In : parsed.args.amount0In;
      const quoteOut = config.tokenIsToken0 ? parsed.args.amount1Out : parsed.args.amount0Out;
      quoteUnits += Number(quoteIn) + Number(quoteOut);
    }

    return {
      symbol,
      priceUsd,
      volume24hUsd: (quoteUnits / 10 ** config.quoteDecimals) * config.quoteUsdPrice,
    };
  } catch (err) {
    return { symbol, priceUsd: null, volume24hUsd: null, error: (err as Error).message };
  }
}

export async function fetchOnchainTokenSnapshots(symbols: string[]): Promise<OnchainTokenSnapshot[]> {
  return Promise.all(symbols.map(fetchOnchainTokenSnapshot));
}
