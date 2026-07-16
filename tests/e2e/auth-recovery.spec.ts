import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const HAS_SERVICE_KEY = !!SERVICE_ROLE_KEY;

function generateEmail(label: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${label}-${ts}-${rand}@e2e-test.marketra`;
}

function generatePassword(): string {
  return "E2eRecovery1!";
}

test.describe("Auth recovery E2E", () => {
  let recoveryUserEmail: string;
  let recoveryUserPassword: string;

  test.beforeAll(async () => {
    if (!HAS_SERVICE_KEY) return;
    recoveryUserEmail = generateEmail("recovery-e2e");
    recoveryUserPassword = generatePassword();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email: recoveryUserEmail,
      password: recoveryUserPassword,
      email_confirm: true,
    });
    if (error) throw error;
    if (!data.user) throw new Error("Failed to create test user");

    await admin
      .from("profiles")
      .insert({ id: data.user.id, email: recoveryUserEmail })
      .maybeSingle();
  });

  test.afterAll(async () => {
    if (!HAS_SERVICE_KEY || !recoveryUserEmail) return;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: users } = await admin.auth.admin.listUsers();
    const user = users?.users.find((u) => u.email === recoveryUserEmail);
    if (user) {
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  test("forgot-password form renders, submits, and shows success state", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Intercept the Supabase /auth/v1/recover POST to avoid hitting the
    // email-send rate limit while still testing the full UI submit flow.
    await page.route("**/auth/v1/recover", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.getByLabel(/email/i).fill(recoveryUserEmail ?? "test@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Generic success message — does not reveal whether email exists.
    await expect(page.getByText(/on its way/i)).toBeVisible();
  });

  test.skip("full recovery flow: forgot-password -> callback -> reset -> sign-in with new password", async ({
    page,
  }) => {
    test.skip(
      true,
      "Skipped: admin.generateLink does not support PKCE flow required by Next.js SSR. A real email catcher (Inbucket) is required for full E2E recovery flow.",
    );

    const newPassword = "UpdatedE2e1!";

    // Step 1: Generate a recovery link via Supabase admin API
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: recoveryUserEmail,
      options: {
        redirectTo: `${BASE_URL}/auth/callback?next=/reset-password`,
      },
    });
    expect(linkError).toBeNull();
    expect(linkData?.properties?.action_link).toBeTruthy();

    const recoveryLink = linkData!.properties!.action_link!;

    // Step 2: Navigate to the recovery link.
    // The link goes through our callback route which exchanges the code
    // and redirects to /reset-password.
    await page.goto(recoveryLink);

    // Step 3: Should land on reset-password page with an active recovery session.
    await expect(page.getByRole("heading", { name: /set a new password/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 4: Fill in the new password.
    await page.getByLabel(/^new password$/i).fill(newPassword);
    await page.getByLabel(/confirm new password/i).fill(newPassword);
    await page.getByRole("button", { name: /update password/i }).click();

    // Step 5: Should redirect to sign-in with success indicator.
    await expect(page).toHaveURL(/\/sign-in\?reset=1/);

    // Step 6: Sign in with new password.
    await page.getByLabel(/email/i).fill(recoveryUserEmail);
    await page.getByLabel(/password/i).fill(newPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Step 7: Should be redirected to dashboard or onboarding.
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    expect(page.url()).not.toContain("/sign-in");
  });

  test("forgot-password form rejects invalid email on client side", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Client-side validation should show an error.
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("unauthenticated user cannot update password via reset-password page", async ({ page }) => {
    await page.goto("/reset-password");
    await page.waitForLoadState("networkidle");

    const onResetPage = page.url().includes("/reset-password");
    const onSignIn = page.url().includes("/sign-in");

    if (onResetPage) {
      await page.getByLabel(/^new password$/i).fill("SomePass1!");
      await page.getByLabel(/confirm new password/i).fill("SomePass1!");
      await page.getByRole("button", { name: /update password/i }).click();

      // Server action should return an error (no recovery session).
      await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 10000 });
      expect(page.url()).toContain("/reset-password");
    } else {
      expect(onSignIn).toBe(true);
    }
  });
});
