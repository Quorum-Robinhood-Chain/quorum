import { NextResponse } from "next/server";
import { getTickerPresentation } from "@/lib/presenters/ticker";

export const dynamic = "force-dynamic"; // never statically cache — this is the live ticker

export async function GET() {
  const data = await getTickerPresentation();
  return NextResponse.json(data);
}
