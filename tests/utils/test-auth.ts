import { type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

/**
 * Strict authentication helper for tests.
 * Fails immediately if signInWithPassword fails (e.g. due to rate limits),
 * to prevent tests from silently running as anon and failing with misleading RLS errors.
 *
 * @param client Supabase client to authenticate
 * @param email User email
 * @param password User password
 */
export async function authenticateTestClient(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    // Report only the safe code/message, NEVER the full error object or credentials
    throw new Error(`Authentication setup failed for test user: ${error.code || error.message}`);
  }
}
