import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@/lib/x402/paywall";
import { getFlags } from "@/lib/x402/data";

export const dynamic = "force-dynamic";

export const GET = withX402("flags", async (req: NextRequest) => {
  const token = new URL(req.url).pathname.split("/").pop() ?? "";
  const payload = await getFlags(token);

  if (!payload) {
    return NextResponse.json(
      { error: "token_not_tracked", token: token.toUpperCase() },
      { status: 404 }
    );
  }
  return payload;
});
