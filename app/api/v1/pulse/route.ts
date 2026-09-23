import { withX402 } from "@/lib/x402/paywall";
import { getPulse } from "@/lib/x402/data";

export const dynamic = "force-dynamic";

export const GET = withX402("pulse", async () => getPulse());
