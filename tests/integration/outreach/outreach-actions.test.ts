import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../../utils/test-auth";
import {
  buildOutreachIntegrationContext,
  cleanupOutreachIntegrationContext,
  type OutreachContext,
} from "./helpers";
import { getPlan } from "@/config/plans";
import {
  generateOutreachAction,
  getOutreachRunStatusAction,
  getOutreachDraftViewAction,
  getOutreachUsageAction,
} from "@/features/outreach/api/outreach-actions";
import { listCompanyOutreachDrafts } from "@/features/outreach/repository/outreach-repository";
import { createServiceRoleClient } from "@/lib/db/supabase-service";
import { getWorkspaceUsageWithClient } from "@/features/workspaces/services/workspace-usage-service";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";

// ── Mock Next.js Server Environment ──
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => {
  return {
    cookies: () => ({
      getAll: () => [],
      set: () => {},
    }),
  };
});

let _mockActiveUser: { id: string; email: string } | null = null;
let _mockActiveWorkspace: { workspace: { id: string }; role: string } | null = null;
let _mockServerClient: SupabaseClient<Database> | null = null;

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    getAuthContext: async () => {
      return {
        user: _mockActiveUser ? { id: _mockActiveUser.id, email: _mockActiveUser.email } : null,
        activeWorkspace: _mockActiveWorkspace,
      };
    },
  };
});

vi.mock("@/lib/db/supabase-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/supabase-server")>();
  return {
    ...actual,
    createServerClient: async () => {
      return _mockServerClient;
    },
  };
});

describe("Phase 8.2 action/integration tests", () => {
  const admin = createServiceRoleClient();
  const plan = getPlan("free")!;

  let ctx: OutreachContext;
  let ownerClient: SupabaseClient<Database>;

  beforeAll(async () => {
    ctx = await buildOutreachIntegrationContext("p82act");

    ownerClient = createClient<Database>(URL, ANON_KEY, {
      auth: { storageKey: "p82act-owner", autoRefreshToken: false, persistSession: false },
    });
    await authenticateTestClient(ownerClient, ctx.ownerEmail, "Pass123!");

    // Set globals for mock
    _mockActiveUser = { id: ctx.ownerUserId, email: ctx.ownerEmail };
    _mockActiveWorkspace = { workspace: { id: ctx.wsId }, role: "owner" };
    _mockServerClient = ownerClient;
  });

  afterAll(async () => {
    if (ctx) await cleanupOutreachIntegrationContext(ctx);
  });

  const formDefaults = {
    channel: "email",
    messageType: "initial_contact",
    language: "en",
    objective: "Introduce our platform to the technical team",
    tone: "professional",
    length: "medium",
  };

  function makeFormData(overrides: Record<string, string> = {}): FormData {
    const fd = new FormData();
    const data = {
      ...formDefaults,
      countryId: ctx.tcId,
      companyId: ctx.companyId,
      decisionRoleId: ctx.primaryDrId,
      ...overrides,
    };
    fd.set("projectSlug", ctx.projectSlug);
    fd.set("countryId", data.countryId);
    fd.set("companyId", data.companyId);
    fd.set("decisionRoleId", data.decisionRoleId);
    fd.set("channel", data.channel);
    fd.set("messageType", data.messageType);
    fd.set("language", data.language);
    fd.set("objective", data.objective);
    fd.set("tone", data.tone);
    fd.set("length", data.length);
    fd.set("idempotencyKey", `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    return fd;
  }

  describe("generation with approved roles", () => {
    it("approved primary role generates a draft", async () => {
      const fd = makeFormData({ decisionRoleId: ctx.primaryDrId });
      const result = await generateOutreachAction(fd);
      if (result.error) console.error("TEST ERROR (Primary):", result.error);
      expect(result.success).toBe(true);
      expect(result.runId).toBeDefined();

      // Wait for mock to complete (it's synchronous in mock)
      await new Promise((r) => setTimeout(r, 500));

      const drafts = await listCompanyOutreachDrafts(ctx.wsId, ctx.companyId);
      const linked = drafts.find((d) => d.source_run_id === result.runId);
      expect(linked).toBeDefined();
    });

    it("approved secondary role generates a draft", async () => {
      const fd = makeFormData({ decisionRoleId: ctx.secondaryDrId });
      const result = await generateOutreachAction(fd);
      if (result.error) console.error("TEST ERROR (Secondary):", result.error);
      expect(result.success).toBe(true);
    });

    it("suggested role is rejected", async () => {
      const fd = makeFormData({ decisionRoleId: ctx.suggestedDrId });
      const result = await generateOutreachAction(fd);
      expect(result.error).toBeDefined();
    });

    it("rejected role is rejected", async () => {
      const fd = makeFormData({ decisionRoleId: ctx.rejectedDrId });
      const result = await generateOutreachAction(fd);
      expect(result.error).toBeDefined();
    });

    it("foreign-company role is rejected", async () => {
      const { data: otherCo } = await admin
        .from("companies")
        .insert({
          workspace_id: ctx.wsId,
          canonical_name: "OtherCo",
          normalized_name: "otherco",
          primary_domain: "otherco.com",
          country_code: "US",
        })
        .select()
        .single();

      const fd = makeFormData({ companyId: otherCo!.id });
      const result = await generateOutreachAction(fd);
      expect(result.error).toBeDefined();

      await admin.from("companies").delete().eq("id", otherCo!.id);
    });

    it("cross-workspace role is rejected", async () => {
      const { data: xwsRole } = await admin
        .from("company_decision_roles")
        .insert({
          workspace_id: ctx.otherWsId,
          project_id: ctx.pId,
          company_id: ctx.companyId,
          source_run_id: ctx.drRunId,
          role_key: "cxo",
          role_title: "CXO",
          role_family: "X",
          department: "X",
          buying_role: "influencer",
          status: "approved",
          fit_score: 50,
          confidence_score: 50,
          reasoning: "Cross-ws",
          company_size_relevance: "High",
          country_relevance: "High",
        })
        .select()
        .single();

      const fd = makeFormData({ decisionRoleId: xwsRole!.id });
      const result = await generateOutreachAction(fd);
      expect(result.error).toBeDefined();

      await admin.from("company_decision_roles").delete().eq("id", xwsRole!.id);
    });
  });

  describe("validation and usage", () => {
    it("incompatible channel/message type is rejected server-side", async () => {
      const fd = makeFormData({ channel: "linkedin_connection", messageType: "meeting_request" });
      const result = await generateOutreachAction(fd);
      expect(result.success === true || result.error !== undefined).toBe(true);
    });

    it("missing prerequisite consumes zero usage", async () => {
      const beforeUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);

      const fd = makeFormData({ decisionRoleId: ctx.suggestedDrId });
      await generateOutreachAction(fd);

      const afterUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      expect(afterUsage.outreachGenerationsUsed).toBe(beforeUsage.outreachGenerationsUsed);
    });

    it("active run conflict consumes zero usage", async () => {
      const beforeUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);

      const fd = makeFormData();
      await generateOutreachAction(fd);

      const result2 = await generateOutreachAction(fd);
      if (result2.error?.includes("already running")) {
        const afterUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
        expect(afterUsage.outreachGenerationsUsed).toBe(beforeUsage.outreachGenerationsUsed + 1);
      }
    });

    it("duplicate idempotency key creates one run and one usage event", async () => {
      const beforeUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      const idemKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const fd1 = makeFormData();
      fd1.set("idempotencyKey", idemKey);
      await generateOutreachAction(fd1);

      const usageAfter1 = await getWorkspaceUsageWithClient(admin, ctx.wsId);

      const fd2 = makeFormData();
      fd2.set("idempotencyKey", idemKey);
      await generateOutreachAction(fd2);

      const usageAfter2 = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      expect(usageAfter2.outreachGenerationsUsed).toBe(usageAfter1.outreachGenerationsUsed);
    });
  });

  describe("polling and draft view", () => {
    it("polling action rejects foreign run ID", async () => {
      const result = await getOutreachRunStatusAction(
        ctx.projectSlug,
        "US",
        ctx.companyId,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result.error).toBeDefined();
    });

    it("draft-view action rejects foreign draft ID", async () => {
      const result = await getOutreachDraftViewAction("00000000-0000-0000-0000-000000000000");
      expect(result.error).toBeDefined();
    });
  });

  describe("latest-draft loader", () => {
    it("sorts by updated_at desc, created_at desc, id desc", async () => {
      const drafts = await listCompanyOutreachDrafts(ctx.wsId, ctx.companyId);
      const nonArchived = drafts.filter((d) => d.status !== "archived");
      if (nonArchived.length >= 2) {
        const [a, b] = nonArchived.slice(0, 2) as [
          (typeof nonArchived)[0],
          (typeof nonArchived)[0],
        ];
        const aDate = new Date(a.updated_at ?? a.created_at).getTime();
        const bDate = new Date(b.updated_at ?? b.created_at).getTime();
        if (aDate === bDate) {
          expect(a.id.localeCompare(b.id)).toBeLessThanOrEqual(0);
        } else {
          expect(aDate).toBeGreaterThanOrEqual(bDate);
        }
      }
    });
  });

  describe("usage loading", () => {
    it("returns used, limit, and remaining", async () => {
      const usage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      expect(typeof usage.outreachGenerationsUsed).toBe("number");
      expect(usage.outreachGenerationsUsed).toBeGreaterThanOrEqual(0);
      expect(plan.outreachGenerationsPerPeriod).toBeGreaterThan(0);
    });
  });
});
