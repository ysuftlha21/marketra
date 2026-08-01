import { classifyRedisPreviewSmokeResponse } from "./lib/redis-preview-smoke-result.mjs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const previewUrl = process.env.MARKETRA_PREVIEW_URL;
const smokeToken = process.env.RATE_LIMIT_REDIS_SMOKE_TOKEN;

if (!previewUrl || !smokeToken) {
  console.error(
    JSON.stringify({ httpStatus: null, errorCategory: "operator_configuration_missing" }),
  );
  process.exit(1);
}

let endpoint;
try {
  const base = new URL(previewUrl);
  if (base.protocol !== "https:" && base.hostname !== "127.0.0.1") throw new Error();
  endpoint = new URL("/api/internal/redis-rate-limit-smoke", base.origin);
} catch {
  console.error(JSON.stringify({ httpStatus: null, errorCategory: "preview_url_invalid" }));
  process.exit(1);
}

async function invokeDirectly() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${smokeToken}` },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  let payload = {};
  let parsed = true;
  try {
    payload = await response.json();
  } catch {
    parsed = false;
  }
  return classifyRedisPreviewSmokeResponse(response.status, payload, parsed);
}

function invokeThroughVercelCli() {
  if (!/^[a-z0-9-]+\.vercel\.app$/i.test(endpoint.hostname)) {
    return {
      success: false,
      output: { httpStatus: null, errorCategory: "vercel_deployment_url_required" },
    };
  }
  const executable = process.platform === "win32" ? process.execPath : "npx";
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "marketra-redis-smoke-"));
  const configPath = join(temporaryDirectory, "curl.conf");
  writeFileSync(configPath, `header = "Authorization: Bearer ${smokeToken}"\n`, {
    mode: 0o600,
  });
  let child;
  try {
    const argumentsList = [
      "vercel",
      "curl",
      endpoint.pathname,
      "--deployment",
      endpoint.origin,
      "--",
      "--request",
      "POST",
      "--silent",
      "--show-error",
      "--include",
      "--config",
      configPath,
    ];
    if (process.platform === "win32") {
      const npxCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
      child = spawnSync(executable, [npxCli, ...argumentsList], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
    } else {
      child = spawnSync(executable, argumentsList, {
        encoding: "utf8",
        timeout: 30_000,
      });
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
  if (child.error || child.status === null) {
    return {
      success: false,
      output: { httpStatus: null, errorCategory: "vercel_cli_failed" },
    };
  }
  const statusMatch = child.stdout.match(/HTTP\/[^\s]+\s+(\d{3})/);
  const headerStart = statusMatch?.index ?? -1;
  const headerOutput = headerStart >= 0 ? child.stdout.slice(headerStart) : "";
  const separator = headerOutput.match(/\r?\n\r?\n/);
  if (!statusMatch || !separator || separator.index === undefined) {
    return {
      success: false,
      output: { httpStatus: null, errorCategory: "vercel_cli_unexpected_output" },
    };
  }
  const body = headerOutput.slice(separator.index + separator[0].length).trim();
  const status = Number(statusMatch[1]);
  let payload = {};
  let parsed = true;
  try {
    payload = JSON.parse(body);
  } catch {
    parsed = false;
  }
  return classifyRedisPreviewSmokeResponse(status, payload, parsed);
}

try {
  const result =
    process.env.MARKETRA_USE_VERCEL_CLI === "true"
      ? invokeThroughVercelCli()
      : await invokeDirectly();
  const line = JSON.stringify(result.output, null, 2);
  if (result.success) console.log(line);
  else console.error(line);
  if (!result.success) process.exit(1);
} catch {
  console.error(JSON.stringify({ httpStatus: null, errorCategory: "request_failed" }));
  process.exit(1);
}
