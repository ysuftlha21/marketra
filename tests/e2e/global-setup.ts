import { cleanTestFixtures } from "../utils/fixture-cleanup";
import { buildE2eOutreachState, ensureE2eOutreachWorkspace } from "../utils/e2e-outreach-builder";
import { createClient } from "@supabase/supabase-js";
import { boundedE2eFetch } from "../utils/bounded-fetch";

export default async function globalSetup() {
  console.log("--- E2E Global Setup: Starting fixture cleanup ---");

  try {
    const result = await cleanTestFixtures();
    console.log("Global setup cleanup complete.");
    console.log(`Desktop Workspace: ${result.desktopWorkspaceId}`);
    console.log(`Mobile Workspace: ${result.mobileWorkspaceId}`);
    console.log(`Outreach State Workspace: ${result.stateWorkspaceId}`);
    for (const [table, count] of Object.entries(result.deletedCounts)) {
      if (count > 0) {
        console.log(`  - ${table}: ${count}`);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch: boundedE2eFetch },
    });

    if (result.desktopUserId) {
      const workspaceId = await ensureE2eOutreachWorkspace(
        supabase,
        result.desktopUserId,
        result.desktopOutreachWorkspaceId,
        "Desktop",
      );
      await buildE2eOutreachState(
        supabase,
        workspaceId,
        "E2E-OUTREACH-DESKTOP",
        result.desktopUserId,
        "core",
      );
      console.log("Desktop Outreach state seeded.");
    }

    if (result.mobileUserId) {
      const workspaceId = await ensureE2eOutreachWorkspace(
        supabase,
        result.mobileUserId,
        result.mobileOutreachWorkspaceId,
        "Mobile",
      );
      await buildE2eOutreachState(
        supabase,
        workspaceId,
        "E2E-OUTREACH-MOBILE",
        result.mobileUserId,
        "mobile",
      );
      console.log("Mobile Outreach state seeded.");
    }

    if (result.stateUserId) {
      const workspaceId = await ensureE2eOutreachWorkspace(
        supabase,
        result.stateUserId,
        result.stateOutreachWorkspaceId,
        "States",
      );
      await buildE2eOutreachState(
        supabase,
        workspaceId,
        "E2E-OUTREACH-STATE",
        result.stateUserId,
        "states",
      );
      console.log("Outreach persisted-state fixtures seeded.");
    }

    for (const [userId, workspaceId] of [
      [result.desktopUserId, result.desktopWorkspaceId],
      [result.mobileUserId, result.mobileWorkspaceId],
      [result.stateUserId, result.stateWorkspaceId],
    ]) {
      if (userId && workspaceId) {
        const { error } = await supabase
          .from("user_preferences")
          .update({ active_workspace_id: workspaceId })
          .eq("user_id", userId);
        if (error) throw new Error("Failed to reset E2E active workspace");
      }
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Global setup failed:", err.message || err);
    process.exit(1);
  }
}
