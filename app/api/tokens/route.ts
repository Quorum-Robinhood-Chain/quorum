import { NextResponse } from "next/server";
import { getTokensPresentation } from "@/lib/presenters/tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  const { tokens, usingLiveData } = await getTokensPresentation();
  return NextResponse.json({ tokens, usingLiveData });
}
