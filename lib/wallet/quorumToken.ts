import { Contract, JsonRpcProvider, formatUnits, isAddress } from 'ethers';
import { env, envNumber } from '@/lib/env';

// Minimal ERC-20 read surface — balanceOf is all the gate needs.
const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

// $QUORUM isn't deployed yet (see README "Open items"). Every value below is a
// placeholder read from env so the gate can be wired, tested, and flipped on
// the moment the contract exists — nothing here should be hardcoded.
export function quorumTokenAddress(): string | undefined {
  return env('QUORUM_TOKEN_ADDRESS');
}

function quorumTokenDecimals(): number {
  return envNumber('QUORUM_TOKEN_DECIMALS', 18);
}

// Minimum balance required to read gated (< 1 hour old) articles.
export function quorumMinBalance(): number {
  return envNumber('QUORUM_MIN_BALANCE', 50_000);
}

function quorumRpcUrl(): string | undefined {
  // Falls back to the same Robinhood Chain RPC used for market data — override
  // with QUORUM_TOKEN_RPC_URL if $QUORUM ends up deployed on a different chain.
  return env('QUORUM_TOKEN_RPC_URL') ?? env('RHC_RPC_URL');
}

export type BalanceCheck =
  | { ok: true; balance: number; required: number }
  | {
      ok: false;
      reason: 'not_configured' | 'invalid_address' | 'insufficient_balance' | 'rpc_error';
      required: number;
      detail?: string;
    };

// Whether the gate is configured at all. Lets callers give a clear "not live
// yet" message instead of a confusing failed balance check.
export function isQuorumGateConfigured(): boolean {
  return Boolean(quorumTokenAddress() && quorumRpcUrl());
}

// Read an address's $QUORUM balance and compare it against the gate threshold.
export async function checkQuorumBalance(address: string): Promise<BalanceCheck> {
  const required = quorumMinBalance();
  const tokenAddress = quorumTokenAddress();
  const rpcUrl = quorumRpcUrl();

  if (!tokenAddress || !rpcUrl) {
    return { ok: false, reason: 'not_configured', required };
  }

  if (!isAddress(address)) {
    return { ok: false, reason: 'invalid_address', required };
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const token = new Contract(tokenAddress, ERC20_ABI, provider);
    const raw = await token.balanceOf(address);
    const balance = Number(formatUnits(raw, quorumTokenDecimals()));

    return balance >= required
      ? { ok: true, balance, required }
      : { ok: false, reason: 'insufficient_balance' as const, required, detail: `balance ${balance}` };
  } catch (err) {
    return {
      ok: false,
      reason: 'rpc_error',
      required,
      detail: err instanceof Error ? err.message : 'unknown RPC error',
    };
  }
}
