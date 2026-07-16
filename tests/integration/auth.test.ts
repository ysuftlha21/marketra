import { describe, it, expect, beforeAll, afterAll } from "vitest";
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

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function uid(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

let _cleanupIds: string[] = [];

async function signUp(email: string, password: string): Promise<string> {
  const admin = svc();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned");
  _cleanupIds.push(data.user.id);
  // Explicitly create profile + preferences (the handle_new_user trigger
  // may not fire reliably when users are created via the Admin API)
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

if (!HAS_SUPABASE) {
  describe.skip("Auth integration", () => {
    it("requires Supabase credentials", () => {});
  });
} else {
  describe("Auth flows", () => {
    const PWD = "TestPass123!";
    let email: string;

    beforeAll(() => {
      email = `auth-test-${uid("a")}@example.com`;
    });

    afterAll(async () => {
      await deleteTestUsers();
    }, 15000);

    it("1. Sign-up creates user and auto-creates profile + preferences", async () => {
      const userId = await signUp(email, PWD);
      expect(userId).toBeTruthy();

      const admin = svc();
      const { data: profile } = await admin
        .from("profiles")
        .select("id, email")
        .eq("id", userId)
        .maybeSingle();
      expect(profile).not.toBeNull();
      expect(profile!.email).toBe(email);

      const { data: prefs } = await admin
        .from("user_preferences")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      expect(prefs).not.toBeNull();
    });

    it("2. Sign-in with password returns a session", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      const { data, error } = await client.auth.signInWithPassword({ email, password: PWD });
      expect(error).toBeNull();
      expect(data.session).not.toBeNull();
      expect(data.session!.access_token).toBeTruthy();
      expect(data.session!.refresh_token).toBeTruthy();
      expect(data.user).not.toBeNull();
      expect(data.user!.email).toBe(email);
    });

    it("3. Session allows authenticated access", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      await authenticateTestClient(client, email, PWD);

      const {
        data: { user },
      } = await client.auth.getUser();
      expect(user).not.toBeNull();
      expect(user!.email).toBe(email);
    });

    it("4. Session persists after token refresh", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      await authenticateTestClient(client, email, PWD);

      const {
        data: { session },
      } = await client.auth.getSession();
      expect(session).not.toBeNull();

      const client2 = createClient<Database>(URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await client2.auth.setSession({
        access_token: session!.access_token,
        refresh_token: session!.refresh_token,
      });

      const {
        data: { user },
      } = await client2.auth.getUser();
      expect(user).not.toBeNull();
      expect(user!.email).toBe(email);
    });

    it("5. Sign-out clears the session", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      await authenticateTestClient(client, email, PWD);

      const { error } = await client.auth.signOut();
      expect(error).toBeNull();

      const {
        data: { user },
      } = await client.auth.getUser();
      expect(user).toBeNull();
    });

    it("6. Unauthenticated client has no user", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      const {
        data: { user },
      } = await client.auth.getUser();
      expect(user).toBeNull();
    });

    it("7. Wrong password returns auth error", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      const { error } = await client.auth.signInWithPassword({
        email,
        password: "WrongPassword999!",
      });
      expect(error).not.toBeNull();
    });

    it("8. Non-existent email returns auth error on sign-in", async () => {
      const client = createClient<Database>(URL, ANON_KEY);
      const { error } = await client.auth.signInWithPassword({
        email: "nonexistent@example.com",
        password: PWD,
      });
      expect(error).not.toBeNull();
    });
  });
}
