import { defineConfig } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3000";

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
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  globalSetup: "./tests/e2e/global-setup.ts",
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
      dependencies: ["setup"],
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
      ],
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    /* ─── Mobile — authenticated (isolated user #2) ──────────── */
    {
      name: "chromium-mobile",
      dependencies: ["setup"],
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
      dependencies: ["setup"],
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
    command: "npm run build && npm run start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
