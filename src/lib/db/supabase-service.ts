import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

/**
 * Service-role client. SERVER-ONLY. Bypasses RLS.
 * Use exclusively for trusted admin / system operations (webhooks, migrations, support tooling).
 * NEVER use for ordinary authenticated user requests — those use the SSR-bound anon client.
 */
export function createServiceRoleClient(): ReturnType<typeof createClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigError(
      "Service role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}
