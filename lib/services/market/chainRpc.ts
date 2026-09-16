import { JsonRpcProvider, Interface, type Log } from "ethers";

// Robinhood Chain RPC (chain ID 4663) — used for "new token launches" detection by
// watching DEX factory `PairCreated`/`PoolCreated` events (§6.2, §7.2).
// FACTORY_ADDRESSES needs each DEX's factory contract address on Robinhood Chain,
// which isn't guessable — confirm from each DEX's own deployment docs.

const FACTORY_ADDRESSES: Record<string, string> = parseAddressMap(process.env.DEX_FACTORY_MAP);

// Uniswap V2/V3-style factory event signatures — adjust per DEX if they use a different ABI.
const FACTORY_IFACE = new Interface([
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
]);

function parseAddressMap(raw?: string): Record<string, string> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getProvider(): JsonRpcProvider {
  const rpcUrl = process.env.RHC_RPC_URL;
  if (!rpcUrl) throw new Error("RHC_RPC_URL is not set");
  return new JsonRpcProvider(rpcUrl, Number(process.env.RHC_CHAIN_ID || 4663));
}

export interface NewPairEvent {
  dex: string;
  token0: string;
  token1: string;
  pairAddress: string;
  blockNumber: number;
  txHash: string;
}

/** Scans the last `blockRange` blocks on each configured factory for new-pair events. */
export async function fetchNewPairsSince(blockRange = 1800): Promise<NewPairEvent[]> {
  if (Object.keys(FACTORY_ADDRESSES).length === 0) {
    return []; // DEX_FACTORY_MAP not configured — nothing to scan yet.
  }

  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - blockRange);

  const results: NewPairEvent[] = [];

  for (const [dex, address] of Object.entries(FACTORY_ADDRESSES)) {
    try {
      const logs: Log[] = await provider.getLogs({
        address,
        fromBlock,
        toBlock: latest,
        topics: [FACTORY_IFACE.getEvent("PairCreated")!.topicHash],
      });

      for (const log of logs) {
        const parsed = FACTORY_IFACE.parseLog(log);
        if (!parsed) continue;
        results.push({
          dex,
          token0: parsed.args.token0,
          token1: parsed.args.token1,
          pairAddress: parsed.args.pair,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        });
      }
    } catch {
      // One DEX's factory ABI not matching the event signature shouldn't break the others.
      continue;
    }
  }

  return results;
}

/** Rough transaction-count-over-window proxy for "chain activity" — used in the Network Snapshot. */
export async function fetchLatestBlockNumber(): Promise<number | null> {
  try {
    const provider = getProvider();
    return await provider.getBlockNumber();
  } catch {
    return null;
  }
}
