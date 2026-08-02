import { defineConfig } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reuseExistingFixtures = process.env.E2E_REUSE_EXISTING_FIXTURES === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Authenticated specs mutate user-scoped workspace and Free-plan quota state.
  // Keep the authoritative suite serial until each mutating feature has an
  // isolated test user and workspace.
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  globalSetup: reuseExistingFixtures ? undefined : "./tests/e2e/global-setup.ts",
  projects: [
    /* ─── Auth setup ───────────────────────────────────────────
     * Creates three independent storage state files, one per project.
     * Each file holds a distinct Supabase user session so that a sign-out
     * in one project never invalidates another project's refresh token. */
    {
      name: "setup",
      testMatch: "**/auth-setup.ts",
    },
    /* ─── Desktop — authenticated (isolated user #1) ─────────── */
    {
      name: "chromium-desktop",
      dependencies: reuseExistingFixtures ? [] : ["setup"],
      testMatch: [
        "**/authenticated*.ts",
        "**/screenshots-discovery*",
        "**/screenshots-sprint.spec.ts",
        "**/screenshots-outreach*",
        "**/phase-9-readiness.spec.ts",
      ],
      testIgnore: "**/signout*",
      use: {
        storageState: "playwright/.auth/desktop-user.json",
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    /* ─── Desktop — unauthenticated (no storage state) ───────── */
    {
      name: "chromium-desktop-unauthed",
      testMatch: [
        "**/auth.spec.ts",
        "**/auth-recovery.spec.ts",
        "**/marketing.spec.ts",
        "**/dashboard.spec.ts",
        "**/screenshots-marketing*",
        "**/phase-10-public.spec.ts",
        "**/rate-limit-denial.spec.ts",
      ],
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    /* ─── Mobile — authenticated (isolated user #2) ──────────── */
    {
      name: "chromium-mobile",
      dependencies: reuseExistingFixtures ? [] : ["setup"],
      testMatch: [
        "**/authenticated*.ts",
        "**/mobile-discovery*",
        "**/screenshots-outreach*",
        "**/phase-9-readiness.spec.ts",
      ],
      testIgnore: ["**/signout*", "**/dashboard.spec.ts", "**/authenticated-projects.spec.ts"],
      use: {
        storageState: "playwright/.auth/mobile-user.json",
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "chromium-outreach-states",
      dependencies: reuseExistingFixtures ? [] : ["setup"],
      testMatch: ["**/authenticated-outreach.spec.ts", "**/screenshots-outreach.spec.ts"],
      use: {
        storageState: "playwright/.auth/signout-user.json",
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    /* ─── Mobile — unauthenticated (no storage state) ────────── */
    {
      name: "chromium-mobile-unauthed",
      testMatch: ["**/mobile.spec.ts", "**/auth.spec.ts", "**/phase-10-public.spec.ts"],
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    /* ─── Sign-out — authenticated (isolated user #3) ──────────
     * Runs exclusively after desktop + mobile complete.
     * Its own Supabase user ensures the sign-out does not revoke
     * the refresh tokens used by the other two projects. */
    {
      name: "chromium-signout",
      dependencies: ["chromium-desktop", "chromium-mobile"],
      testMatch: "**/signout*.ts",
      use: {
        storageState: "playwright/.auth/signout-user.json",
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `${BASE_URL}/api/health/live`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_ENV: "test",
      NEXT_PUBLIC_APP_URL: BASE_URL,
      DEFAULT_RATE_LIMIT_PROVIDER: process.env.E2E_RATE_LIMIT_PROVIDER ?? "mock",
      DEFAULT_COMPANY_DISCOVERY_PROVIDER: "mock",
      DEFAULT_BUYER_DISCOVERY_PROVIDER: "mock",
      DEFAULT_EMAIL_ENRICHMENT_PROVIDER: "mock",
      DEFAULT_AI_PROVIDER: "mock",
      DEFAULT_OUTREACH_PROVIDER: "mock",
      DEFAULT_BILLING_PROVIDER: "mock",
    },
  },
});
