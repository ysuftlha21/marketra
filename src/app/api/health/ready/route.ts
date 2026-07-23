import { NextResponse } from "next/server";
import { parseServerEnv } from "@/lib/env/env";
import { checkReadiness } from "@/features/health/services/readiness-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = parseServerEnv();
  const result = await checkReadiness(env);
  return NextResponse.json(
    {
      status: result.ready ? "ready" : "unavailable",
      version: env.BUILD_VERSION,
      timestamp: new Date().toISOString(),
    },
    { status: result.ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
