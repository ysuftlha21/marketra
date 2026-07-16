import { test as setup, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";

const AUTH_DIR = resolve("playwright/.auth");

interface Credentials {
  email: string;
  password: string;
}

function loadEnvVar(name: string): string {
  try {
    const lines = readFileSync(resolve(".env.local"), "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === name && val) return val;
    }
  } catch {
    // fall through to process.env
  }
  const env = process.env[name];
  if (env) return env;
  throw new Error(
    `${name} is required for E2E auth setup. Add it to .env.local:\n` + `${name}=your-value`,
  );
}

function loadCredentials(emailKey: string, passwordKey: string): Credentials {
  return { email: loadEnvVar(emailKey), password: loadEnvVar(passwordKey) };
}

async function signInAs(page: Page, creds: Credentials, expectedUserIdKey?: string): Promise<void> {
  const { email, password } = creds;

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", { name: /Sign in/i }).click();

  // Fail fast on UI errors
  const errorMsg = page.getByText(/Invalid login credentials/i);
  if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
    throw new Error(`Authentication failed for ${email}`);
  }

  // We rely on the global setup to have pre-created the workspace, so we just expect Welcome
  await expect(page.getByRole("heading", { name: /Welcome to Marketra/i })).toBeVisible({
    timeout: 15000,
  });
}

function clearOldState(filename: string) {
  try {
    rmSync(resolve(AUTH_DIR, filename), { force: true });
  } catch {
    // ignore
  }
}

setup("authenticate as E2E test user — desktop session", async ({ page }) => {
  mkdirSync(AUTH_DIR, { recursive: true });
  clearOldState("desktop-user.json");
  const creds = loadCredentials("E2E_DESKTOP_USER_EMAIL", "E2E_DESKTOP_USER_PASSWORD");
  await signInAs(page, creds);
  await page.context().storageState({ path: resolve(AUTH_DIR, "desktop-user.json") });
});

setup("authenticate as E2E test user — mobile session", async ({ page }) => {
  mkdirSync(AUTH_DIR, { recursive: true });
  clearOldState("mobile-user.json");
  const creds = loadCredentials("E2E_MOBILE_USER_EMAIL", "E2E_MOBILE_USER_PASSWORD");
  await signInAs(page, creds);
  await page.context().storageState({ path: resolve(AUTH_DIR, "mobile-user.json") });
});

setup("authenticate as E2E test user — signout session", async ({ page }) => {
  mkdirSync(AUTH_DIR, { recursive: true });
  clearOldState("signout-user.json");
  const creds = loadCredentials("E2E_SIGNOUT_USER_EMAIL", "E2E_SIGNOUT_USER_PASSWORD");
  await signInAs(page, creds);
  await page.context().storageState({ path: resolve(AUTH_DIR, "signout-user.json") });
});
