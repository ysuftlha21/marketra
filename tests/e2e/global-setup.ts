import { cleanTestFixtures } from "../utils/fixture-cleanup";
import { buildE2eOutreachState } from "../utils/e2e-outreach-builder";
import { createClient } from "@supabase/supabase-js";

export default async function globalSetup() {
  console.log("--- E2E Global Setup: Starting fixture cleanup ---");

  try {
    const result = await cleanTestFixtures();
    console.log("Global setup cleanup complete.");
    console.log(`Desktop Workspace: ${result.desktopWorkspaceId}`);
    console.log(`Mobile Workspace: ${result.mobileWorkspaceId}`);
    for (const [table, count] of Object.entries(result.deletedCounts)) {
      if (count > 0) {
        console.log(`  - ${table}: ${count}`);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (result.desktopWorkspaceId && result.desktopUserId) {
      await buildE2eOutreachState(
        supabase,
        result.desktopWorkspaceId,
        "E2E-OUTREACH-DESKTOP",
        result.desktopUserId,
      );
      console.log("Desktop Outreach state seeded.");
    }

    if (result.mobileWorkspaceId && result.mobileUserId) {
      await buildE2eOutreachState(
        supabase,
        result.mobileWorkspaceId,
        "E2E-OUTREACH-MOBILE",
        result.mobileUserId,
      );
      console.log("Mobile Outreach state seeded.");
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Global setup failed:", err.message || err);
    process.exit(1);
  }
}
