import { NextResponse } from "next/server";
import { getEcosystemPresentation } from "@/lib/presenters/ecosystem";

export const dynamic = "force-dynamic";

export async function GET() {
  const { protocols, usingLiveData } = await getEcosystemPresentation();
  return NextResponse.json({ protocols, usingLiveData });
}
