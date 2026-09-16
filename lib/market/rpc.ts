import { JsonRpcProvider } from 'ethers';

import { env, envNumber, requireEnv } from '@/lib/env';

// Create an RPC provider using the configured Robinhood Chain endpoint.
export function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(
    requireEnv('RHC_RPC_URL'),
    envNumber('RHC_CHAIN_ID', 4663),
  );
}

// Check whether an RPC endpoint is configured.
export function hasRpcConfigured(): boolean {
  return Boolean(env('RHC_RPC_URL'));
}
