import { NextRequest } from "next/server";
import { withX402 } from "@/lib/x402/paywall";
import { getNews } from "@/lib/x402/data";

export const dynamic = "force-dynamic";

export const GET = withX402("news", async (req: NextRequest) => {
  const limit = Math.min(
    Number(new URL(req.url).searchParams.get("limit") ?? "5") || 5,
    25
  );
  return getNews(limit);
});
