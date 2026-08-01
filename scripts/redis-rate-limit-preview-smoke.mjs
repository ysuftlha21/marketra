const previewUrl = process.env.MARKETRA_PREVIEW_URL;
const smokeToken = process.env.RATE_LIMIT_REDIS_SMOKE_TOKEN;

if (!previewUrl || !smokeToken) {
  console.error("Preview URL and smoke authorization token are required.");
  process.exit(1);
}

let endpoint;
try {
  const base = new URL(previewUrl);
  if (base.protocol !== "https:" && base.hostname !== "127.0.0.1") throw new Error();
  endpoint = new URL("/api/internal/redis-rate-limit-smoke", base.origin);
} catch {
  console.error("The Preview URL is invalid.");
  process.exit(1);
}

const safeFields = [
  "ok",
  "providerConfigured",
  "evalSupported",
  "atomicConsumePassed",
  "denialPassed",
  "ttlPassed",
  "remainingPassed",
  "cleanupPassed",
  "operationId",
];

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${smokeToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  const safe = Object.fromEntries(safeFields.map((field) => [field, payload[field]]));
  console.log(JSON.stringify(safe, null, 2));
  if (!response.ok || safeFields.slice(0, -1).some((field) => safe[field] !== true)) {
    process.exit(1);
  }
} catch {
  console.error("Preview Redis smoke request failed.");
  process.exit(1);
}
