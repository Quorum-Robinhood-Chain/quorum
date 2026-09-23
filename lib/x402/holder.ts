/**
 * Holder discount check for paying agents.
 *
 * This is intentionally NOT a second implementation of the balanceOf call.
 * It reuses lib/wallet/quorumToken.ts — the same live, uncached RPC check
 * the reader-side gate uses — so the two gates can never drift apart or
 * read different env vars (the original prototype checked
 * ROBINHOOD_RPC_URL, but the rest of the app reads QUORUM_TOKEN_RPC_URL /
 * RHC_RPC_URL — this reuse fixes that mismatch instead of papering over it).
 */

import { checkQuorumBalance } from "@/lib/wallet/quorumToken";

/**
 * True when `address` holds at least QUORUM_MIN_BALANCE $QUORUM.
 * Returns false — never throws, never fails open into a discount —
 * when the token is unconfigured, the address is malformed, or the RPC
 * call fails for any reason.
 */
export async function holdsDiscountBalance(address: string): Promise<boolean> {
  const result = await checkQuorumBalance(address);
  return result.ok;
}
