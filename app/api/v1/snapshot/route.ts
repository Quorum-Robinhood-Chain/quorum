import { withX402 } from "@/lib/x402/paywall";
import { getSnapshot } from "@/lib/x402/data";

export const dynamic = "force-dynamic";

export const GET = withX402("snapshot", async () => getSnapshot());
