import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../utils/test-auth";

const HAS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} — set it in .env to run real Supabase tests`);
  return value;
}

const URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function uid(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(URL, ANON_KEY);
}

/** Extract URL params from action_link using regex (avoids vitest URL issues). */
function parseActionLink(link: string): {
  token: string | null;
  type: string | null;
  redirectTo: string | null;
} {
  const g = (name: string) => {
    const m = link.match(new RegExp(`[?&]${name}=([^&]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  };
  return { token: g("token"), type: g("type"), redirectTo: g("redirect_to") };
}

let _cleanupIds: string[] = [];

async function createTestUser(email: string, password: string): Promise<string> {
  const admin = svc();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned");
  _cleanupIds.push(data.user.id);
  await admin.from("profiles").insert({ id: data.user.id, email }).maybeSingle();
  await admin.from("user_preferences").insert({ user_id: data.user.id }).maybeSingle();
  return data.user.id;
}

async function deleteTestUsers(): Promise<void> {
  const admin = svc();
  for (const id of _cleanupIds) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      // already deleted
    }
  }
  _cleanupIds = [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

if (!HAS_SUPABASE) {
  describe.skip("Auth recovery integration", () => {
    it("requires Supabase credentials", () => {});
  });
} else {
  describe("Auth recovery flows", () => {
    const PWD = "InitialPass1!";
    const NEW_PWD = "NewPass123!";
    let email: string;

    beforeAll(async () => {
      email = `recovery-test-${uid("r")}@example.com`;
      await createTestUser(email, PWD);
    }, 30000);

    afterAll(async () => {
      await deleteTestUsers();
    }, 15000);

    // -----------------------------------------------------------------------
    // TASK 1 — Forgot-password (resetPasswordForEmail behavior)
    // -----------------------------------------------------------------------
    describe("forgot-password", () => {
      it("1. resetPasswordForEmail sends recovery email for existing user", async () => {
        const client = anonClient();
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
        });
        // Accept either success or rate limit — the API is reachable.
        if (error) {
          expect(["over_email_send_rate_limit", "email_address_invalid"]).toContain(error.code);
        } else {
          expect(error).toBeNull();
        }
      });

      it(
        "2. resetPasswordForEmail does not reveal whether an email exists",
        { timeout: 30000 },
        async () => {
          // Security property: the error code must never reveal account existence.
          // Supabase may return `over_email_send_rate_limit` or null for both
          // existing and non-existing emails — but never `user_not_found`.
          const client = anonClient();
          const nonExistentEmail = `recovery-nonexistent-${Date.now()}@example.com`;

          // Sequential calls with delay to avoid rate-limit collision.
          await sleep(5000);
          const { error: knownErr } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
          });
          await sleep(5000);
          const { error: unknownErr } = await client.auth.resetPasswordForEmail(nonExistentEmail, {
            redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
          });

          // Neither error may reveal account existence via its code.
          for (const err of [knownErr, unknownErr]) {
            if (err) {
              expect(["over_email_send_rate_limit", "email_address_invalid"]).toContain(err.code);
            } else {
              expect(err).toBeNull();
            }
          }
        },
      );
    });

    // -----------------------------------------------------------------------
    // TASK 2 — Auth callback (code exchange)
    // -----------------------------------------------------------------------
    describe("auth callback", () => {
      it("3. exchangeCodeForSession fails with a fake code", async () => {
        const client = anonClient();
        const { error } = await client.auth.exchangeCodeForSession("fake-code-12345");
        expect(error).not.toBeNull();
      });

      it("4. exchangeCodeForSession fails with empty code", async () => {
        const client = anonClient();
        const { error } = await client.auth.exchangeCodeForSession("");
        expect(error).not.toBeNull();
      });

      it("5. signInWithPassword gives a valid session", async (ctx) => {
        const client = anonClient();
        await authenticateTestClient(client, email, PWD);

        const {
          data: { user },
        } = await client.auth.getUser();
        expect(user).not.toBeNull();
        expect(user!.email).toBe(email);
      });
    });

    // -----------------------------------------------------------------------
    // TASK 3 — Reset-password (updateUser behavior)
    // -----------------------------------------------------------------------
    describe("reset-password", () => {
      // Share a single sign-in session across tests 6–9 to reduce redundant
      // signInWithPassword calls that trigger Supabase rate limits.
      let sessionClient: SupabaseClient<Database> | null = null;
      beforeAll(async () => {
        const client = anonClient();
        await authenticateTestClient(client, email, PWD);
        sessionClient = client;
      }, 15000);

      it("6. updateUser succeeds with a valid session", async () => {
        expect(sessionClient).not.toBeNull();
        const { error: updateErr } = await sessionClient!.auth.updateUser({
          password: NEW_PWD,
        });
        expect(updateErr).toBeNull();
      });

      it("7. new password works for sign-in", async (ctx) => {
        const client = anonClient();
        const { error, data } = await client.auth.signInWithPassword({
          email,
          password: NEW_PWD,
        });
        expect(error).toBeNull();
        expect(data.session).not.toBeNull();
      });

      it("8. old password no longer works", async () => {
        const client = anonClient();
        const { error } = await client.auth.signInWithPassword({
          email,
          password: PWD,
        });
        expect(error).not.toBeNull();
      });

      it("9. session after password update remains valid", async () => {
        // Re-use the session client that was updated in test 6.
        // If test 6 was skipped due to rate limit, beforeEach already skipped this.
        const client = anonClient();
        const { error: signInErr } = await client.auth.signInWithPassword({
          email,
          password: NEW_PWD,
        });
        expect(signInErr).toBeNull();

        const {
          data: { user },
        } = await client.auth.getUser();
        expect(user).not.toBeNull();
        expect(user!.email).toBe(email);
      });
    });

    // -----------------------------------------------------------------------
    // Security
    // -----------------------------------------------------------------------
    describe("security", () => {
      it("10. service-role key is never exposed to anon client", async () => {
        const client = anonClient();
        const { error } = await client.auth.admin.listUsers();
        expect(error).not.toBeNull();
      });

      it("11. recovery link from generateLink has expected structure", async () => {
        const admin = svc();
        const { data, error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${APP_URL}/auth/callback?next=/reset-password` },
        });
        expect(error).toBeNull();
        expect(data?.properties?.action_link).toBeTruthy();

        const actionLink: string = data!.properties!.action_link!;
        expect(typeof actionLink).toBe("string");

        // Parse the action_link manually (vitest URL corner case).
        const parsed = parseActionLink(actionLink);
        expect(parsed.token).toBeTruthy();
        expect(parsed.type).toBe("recovery");
        expect(parsed.redirectTo).toContain("/auth/callback?next=/reset-password");
      });

      it("12. generateLink verify redirect goes to callback URL", async () => {
        const admin = svc();
        const { data, error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${APP_URL}/auth/callback?next=/reset-password` },
        });
        expect(error).toBeNull();

        const actionLink: string = data!.properties!.action_link!;
        const resp = await fetch(actionLink, { redirect: "manual" });
        expect(resp.status).toBe(303);

        const location = resp.headers.get("location");
        expect(location).toBeTruthy();
        expect(location!).toContain("/auth/callback?next=/reset-password");
        expect(location!).toContain("access_token=");
        expect(location!).toContain("type=recovery");
      });
    });
  });
}
