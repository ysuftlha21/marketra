import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseServerEnv, isRedisPreviewSmokeEnabled } from "@/lib/env/env";
import { createRateLimitProvider } from "@/lib/providers/rate-limit/rate-limit.factory";
import { runRedisRateLimitSmoke } from "@/lib/providers/rate-limit/redis-rate-limit-smoke";
import {
  acquirePreviewSmokeExecution,
  consumePreviewSmokeExecution,
  hasValidPreviewSmokeBearer,
  previewSmokeSubject,
  releasePreviewSmokeExecution,
} from "@/lib/security/preview-smoke-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function unavailable() {
  return NextResponse.json({ ok: false }, { status: 404, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!isRedisPreviewSmokeEnabled()) return unavailable();

  let env;
  try {
    env = parseServerEnv();
  } catch {
    return unavailable();
  }
  if (
    !env.RATE_LIMIT_REDIS_SMOKE_TOKEN ||
    !hasValidPreviewSmokeBearer(
      request.headers.get("authorization"),
      env.RATE_LIMIT_REDIS_SMOKE_TOKEN,
    )
  ) {
    return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  }

  const subject = previewSmokeSubject(env.RATE_LIMIT_REDIS_SMOKE_TOKEN);
  const limited = consumePreviewSmokeExecution(subject);
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false },
      {
        status: 429,
        headers: { ...NO_STORE, "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }
  if (!acquirePreviewSmokeExecution(subject)) {
    return NextResponse.json({ ok: false }, { status: 409, headers: NO_STORE });
  }

  try {
    const provider = createRateLimitProvider("redis", {
      url: env.RATE_LIMIT_REDIS_URL,
      token: env.RATE_LIMIT_REDIS_TOKEN,
      timeoutMs: Math.min(env.RATE_LIMIT_REQUEST_TIMEOUT_MS, 1_000),
    });
    const result = await runRedisRateLimitSmoke(provider);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: NO_STORE,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        providerConfigured: false,
        evalSupported: false,
        atomicConsumePassed: false,
        denialPassed: false,
        ttlPassed: false,
        remainingPassed: false,
        cleanupPassed: false,
        operationId: randomUUID(),
      },
      { status: 503, headers: NO_STORE },
    );
  } finally {
    releasePreviewSmokeExecution(subject);
  }
}
