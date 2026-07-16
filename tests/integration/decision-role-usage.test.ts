import { describe, it, expect, beforeAll } from "vitest";
import { createServiceRoleClient } from "@/lib/db/supabase-service";
import {
  consumeDecisionRoleGenerationWithClient,
  getWorkspaceUsageWithClient,
} from "@/features/workspaces/services/workspace-usage-service";
import { getPlan } from "@/config/plans";

function uid(label: string): string {
  return `${label}-${Math.random().toString(36).substring(2, 8)}`;
}

describe("Decision Role Usage Limits", () => {
  let wsId: string;
  let tcId: string;
  let cId: string;
  let testUserId: string;
  const admin = createServiceRoleClient();

  beforeAll(async () => {
    // Create test user
    const email = `dr-usage-${uid("u")}@example.com`;
    const { data: user, error: err } = await admin.auth.admin.createUser({
      email,
      password: "Pass123!",
      email_confirm: true,
    });
    if (err || !user.user) throw err || new Error("no user");
    testUserId = user.user.id;
    await admin
      .from("profiles")
      .insert({ id: testUserId, email, display_name: email })
      .maybeSingle();
    await admin.from("user_preferences").insert({ user_id: testUserId }).maybeSingle();

    // Create a workspace for tests
    const { data: ws, error: wsError } = await admin
      .from("workspaces")
      .insert({ name: "Usage Test WS", slug: uid("ws"), created_by: testUserId })
      .select()
      .single();
    if (wsError) throw wsError;
    wsId = ws!.id;

    await admin.from("workspace_members").insert({
      workspace_id: wsId,
      user_id: testUserId,
      role: "owner",
    });
  });

  it("consumes one unit successfully", async () => {
    const plan = getPlan("free")!;
    await consumeDecisionRoleGenerationWithClient(admin, wsId, uid("idem-dr"), plan);

    const usage = await getWorkspaceUsageWithClient(admin, wsId);
    expect(usage.decisionRoleGenerationsUsed).toBe(1);
  });

  it("duplicate idempotency key does not double-consume", async () => {
    const plan = getPlan("free")!;
    const key = uid("idem-dup");

    await consumeDecisionRoleGenerationWithClient(admin, wsId, key, plan);
    await consumeDecisionRoleGenerationWithClient(admin, wsId, key, plan); // Should just return, not throw

    const usage = await getWorkspaceUsageWithClient(admin, wsId);
    expect(usage.decisionRoleGenerationsUsed).toBe(2); // previous test consumed 1, this consumed 1 = 2
  });

  it("enforces free plan limit", async () => {
    const plan = getPlan("free")!;
    // Free plan allows 5. We already used 2.
    await consumeDecisionRoleGenerationWithClient(admin, wsId, uid("f3"), plan);
    await consumeDecisionRoleGenerationWithClient(admin, wsId, uid("f4"), plan);
    await consumeDecisionRoleGenerationWithClient(admin, wsId, uid("f5"), plan);

    await expect(
      consumeDecisionRoleGenerationWithClient(admin, wsId, uid("f6"), plan),
    ).rejects.toThrow(/Plan limit reached/);
  });
});
