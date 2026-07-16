// Creates E2E test users in Supabase for isolated Playwright projects.
// Each project (desktop, mobile, signout) gets its own Supabase user/session.
// Usage: node scripts/create-e2e-users.mjs
//
// Reads credentials from environment variables. Never hardcode passwords.

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(__dirname, "..", ".env.local");

function readVar(name) {
  // Try .env.local first (file read, not shell — avoids expanding special chars)
  if (existsSync(envFile)) {
    const lines = readFileSync(envFile, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === name && val) return val;
    }
  }
  const env = process.env[name];
  if (env) return env;
  throw new Error(`Required variable ${name} is not set. Add it to .env.local`);
}

const SUPABASE_URL = readVar("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = readVar("SUPABASE_SERVICE_ROLE_KEY");

const authApi = `${SUPABASE_URL}/auth/v1/admin/users`;

async function createUser(email, password) {
  console.log(`Creating user: ${email}`);
  try {
    const res = await fetch(authApi, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`  User ID: ${data.id}`);
    } else if (data.code === "user_already_exists") {
      console.log(`  Already exists (ID: ${data.msg?.match?.(/[a-f0-9-]+/)?.[0] || "unknown"})`);
    } else {
      console.log(`  Error: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
  }
}

console.log("=== Creating E2E test users ===");
await createUser(readVar("E2E_DESKTOP_USER_EMAIL"), readVar("E2E_DESKTOP_USER_PASSWORD"));
await createUser(readVar("E2E_MOBILE_USER_EMAIL"), readVar("E2E_MOBILE_USER_PASSWORD"));
await createUser(readVar("E2E_SIGNOUT_USER_EMAIL"), readVar("E2E_SIGNOUT_USER_PASSWORD"));
console.log("=== Done ===");
