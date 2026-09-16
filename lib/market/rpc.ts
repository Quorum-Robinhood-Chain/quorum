import { JsonRpcProvider } from 'ethers';
import { env, envNumber, requireEnv } from '@/lib/env';

// Shared Robinhood Chain provider (chain ID 4663). Created per call so a key/URL added
// in Vercel takes effect without a rebuild.
export function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(requireEnv('RHC_RPC_URL'), envNumber('RHC_CHAIN_ID', 4663));
}

export function hasRpcConfigured(): boolean {
  return Boolean(env('RHC_RPC_URL'));
}
