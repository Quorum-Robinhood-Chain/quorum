import { Interface, type Log } from 'ethers';
import { getProvider, hasRpcConfigured } from './rpc';
import { envJson } from '@/lib/env';

const FACTORY_IFACE = new Interface([
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)',
]);

export interface NewPairEvent {
  dex: string;
  token0: string;
  token1: string;
  pairAddress: string;
  blockNumber: number;
  txHash: string;
}

// Fetch newly created DEX pairs from the configured factory contracts.
export async function fetchNewPairsSince(
  blockRange = 1800,
): Promise<NewPairEvent[]> {
  const factories = envJson<string>('DEX_FACTORY_MAP');

  if (Object.keys(factories).length === 0 || !hasRpcConfigured()) return [];

  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - blockRange);
  const topic = FACTORY_IFACE.getEvent('PairCreated')!.topicHash;

  const results: NewPairEvent[] = [];

  for (const [dex, address] of Object.entries(factories)) {
    try {
      const logs: Log[] = await provider.getLogs({
        address,
        fromBlock,
        toBlock: latest,
        topics: [topic],
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
      // Ignore individual DEX errors so other configured factories can still be processed.
    }
  }

  return results;
}

// Fetch the latest block number when an RPC provider is configured.
export async function fetchLatestBlockNumber(): Promise<number | null> {
  if (!hasRpcConfigured()) return null;

  try {
    return await getProvider().getBlockNumber();
  } catch {
    return null;
  }
}
