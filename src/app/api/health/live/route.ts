import { NextResponse } from "next/server";
import { parseServerEnv } from "@/lib/env/env";

export const dynamic = "force-dynamic";

export function GET() {
  const env = parseServerEnv();
  return NextResponse.json(
    { status: "ok", version: env.BUILD_VERSION, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
