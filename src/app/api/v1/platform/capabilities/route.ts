import { NextResponse } from "next/server";
import { getPlatformCapabilityContract } from "@/lib/platform-capabilities";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      data: getPlatformCapabilityContract()
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-RunwayLab-API-Version": "v1"
      }
    }
  );
}
