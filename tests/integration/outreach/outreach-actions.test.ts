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
  getOutreachUsageAction,
  getOutreachRunStatusAction,
  getOutreachDraftViewAction,
} from "@/features/outreach/api/outreach-actions";
import {
  getLatestProjectCompanyOutreachDraft,
  getOutreachDraftVersions,
  getOutreachRun,
  listCompanyOutreachDrafts,
} from "@/features/outreach/repository/outreach-repository";
import { getProjectCompanyOutreachContext } from "@/features/companies/repository/company-repository";
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

      const drafts = await listCompanyOutreachDrafts(ctx.wsId, ctx.companyId);
      const linked = drafts.find((d) => d.source_run_id === result.runId);
      expect(linked).toBeDefined();
      const versions = await getOutreachDraftVersions(ctx.wsId, linked!.id);
      expect(versions).toHaveLength(1);
      expect(versions[0]?.version_number).toBe(1);

      const run = await getOutreachRun(ctx.wsId, result.runId!);
      expect(run?.status).toBe("succeeded");
      const snapshot = run?.input_snapshot as Record<string, unknown>;
      const company = snapshot.company as Record<string, unknown>;
      const companyContext = company.context as Record<string, unknown>;
      expect(company.name).toBe("p82actCorp");
      expect(companyContext.companyName).toBe("p82actCorp");
      expect(companyContext.fitScore).toBe(82);
      expect(companyContext.qualificationReasons).toEqual(["Project-specific fit"]);
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
      expect(result.success).not.toBe(true);
      expect(result.error).toBe("Check the outreach request and try again.");
    });

    it("invalid enum values are rejected server-side", async () => {
      const result = await generateOutreachAction(makeFormData({ channel: "sms" }));
      expect(result.success).not.toBe(true);
      expect(result.error).toBe("Check the outreach request and try again.");
    });

    it("whitespace-only objective is rejected server-side", async () => {
      const result = await generateOutreachAction(makeFormData({ objective: "   " }));
      expect(result.success).not.toBe(true);
      expect(result.error).toBe("Check the outreach request and try again.");
    });

    it("browser-supplied plan input cannot select a paid plan", async () => {
      const fd = makeFormData({ decisionRoleId: ctx.suggestedDrId });
      fd.set("planId", "agency");
      const result = await generateOutreachAction(fd);
      expect(result.error).toBe("An approved decision role is required.");
    });

    it("missing prerequisite consumes zero usage", async () => {
      const beforeUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);

      const fd = makeFormData({ decisionRoleId: ctx.suggestedDrId });
      await generateOutreachAction(fd);

      const afterUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      expect(afterUsage.outreachGenerationsUsed).toBe(beforeUsage.outreachGenerationsUsed);
    });

    it("active run conflict consumes zero usage", async () => {
      const fd = makeFormData();
      const beforeUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      const { data: activeRun } = await admin
        .from("outreach_generation_runs")
        .insert({
          workspace_id: ctx.wsId,
          project_id: ctx.pId,
          company_id: ctx.companyId,
          decision_role_id: ctx.primaryDrId,
          source_decision_role_run_id: ctx.drRunId,
          source_product_analysis_run_id: ctx.paRunId,
          source_market_analysis_run_id: ctx.maRunId,
          source_icp_profile_id: ctx.icpId,
          source_discovery_run_id: ctx.discoveryRunId,
          channel: "email",
          message_type: "initial_contact",
          provider: "mock",
          status: "running",
          current_stage: "generating_outreach",
          idempotency_key: `active-${Date.now()}`,
          started_by: ctx.ownerUserId,
        })
        .select()
        .single();

      const result = await generateOutreachAction(fd);
      const afterUsage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      expect(result.error).toContain("already in progress");
      expect(afterUsage.outreachGenerationsUsed).toBe(beforeUsage.outreachGenerationsUsed);
      await admin.from("outreach_generation_runs").delete().eq("id", activeRun!.id);
    });

    it("duplicate idempotency key creates one run and one usage event", async () => {
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

  describe("project-specific company context", () => {
    it("loads the actual company only through its project-country association", async () => {
      const context = await getProjectCompanyOutreachContext(
        ctx.wsId,
        ctx.pId,
        ctx.tcId,
        ctx.companyId,
      );
      expect(context).toMatchObject({
        companyName: "p82actCorp",
        fitScore: 82,
        qualificationReasons: ["Project-specific fit"],
      });

      const wrongProject = await getProjectCompanyOutreachContext(
        ctx.wsId,
        "00000000-0000-0000-0000-000000000000",
        ctx.tcId,
        ctx.companyId,
      );
      expect(wrongProject).toBeNull();
    });

    it("keeps the same global company scoped to each project context", async () => {
      const secondSlug = `p82act-second-${Date.now()}`;
      const { data: secondProject } = await admin
        .from("projects")
        .insert({
          workspace_id: ctx.wsId,
          created_by: ctx.ownerUserId,
          name: "Second project",
          slug: secondSlug,
          status: "active",
          product_description: "Second project context",
        })
        .select()
        .single();
      const { data: secondCountry } = await admin
        .from("project_target_countries")
        .insert({
          workspace_id: ctx.wsId,
          project_id: secondProject!.id,
          country_code: "GB",
          country_name: "United Kingdom",
          added_by: ctx.ownerUserId,
        })
        .select()
        .single();
      const { data: secondRun } = await admin
        .from("company_discovery_runs")
        .insert({
          workspace_id: ctx.wsId,
          project_id: secondProject!.id,
          target_country_id: secondCountry!.id,
          provider: "mock",
          provider_version: "1",
          status: "completed",
          input_snapshot: {},
          criteria_snapshot: {},
          result_summary: {},
          created_by: ctx.ownerUserId,
        })
        .select()
        .single();
      await admin.from("project_companies").insert({
        workspace_id: ctx.wsId,
        project_id: secondProject!.id,
        target_country_id: secondCountry!.id,
        company_id: ctx.companyId,
        discovery_run_id: secondRun!.id,
        status: "discovered",
        fit_score: 41,
        fit_grade: "medium",
        qualification_reasons: ["Second-project reason"],
        disqualification_reasons: ["Second-project risk"],
        matched_signals: ["second_project_signal"],
        missing_signals: [],
        confidence_score: 55,
        scoring_snapshot: {},
      });

      const firstContext = await getProjectCompanyOutreachContext(
        ctx.wsId,
        ctx.pId,
        ctx.tcId,
        ctx.companyId,
      );
      const secondContext = await getProjectCompanyOutreachContext(
        ctx.wsId,
        secondProject!.id,
        secondCountry!.id,
        ctx.companyId,
      );

      expect(firstContext?.companyName).toBe("p82actCorp");
      expect(secondContext?.companyName).toBe("p82actCorp");
      expect(firstContext?.fitScore).toBe(82);
      expect(secondContext?.fitScore).toBe(41);
      expect(secondContext?.qualificationReasons).toEqual(["Second-project reason"]);
      expect(secondContext?.disqualificationReasons).toEqual(["Second-project risk"]);

      await admin.from("project_companies").delete().eq("project_id", secondProject!.id);
      await admin.from("company_discovery_runs").delete().eq("id", secondRun!.id);
      await admin.from("project_target_countries").delete().eq("id", secondCountry!.id);
      await admin.from("projects").delete().eq("id", secondProject!.id);
    });
  });

  describe("latest-draft loader", () => {
    it("ignores archived and foreign-scope drafts with stable ordering", async () => {
      const now = new Date().toISOString();
      const runPayload = {
        workspace_id: ctx.wsId,
        project_id: ctx.pId,
        company_id: ctx.companyId,
        decision_role_id: ctx.primaryDrId,
        source_decision_role_run_id: ctx.drRunId,
        source_product_analysis_run_id: ctx.paRunId,
        source_market_analysis_run_id: ctx.maRunId,
        source_icp_profile_id: ctx.icpId,
        source_discovery_run_id: ctx.discoveryRunId,
        channel: "email",
        message_type: "initial_contact",
        provider: "mock",
        status: "succeeded",
        current_stage: "complete",
        started_by: ctx.ownerUserId,
        started_at: now,
        completed_at: now,
      };
      const { data: runs } = await admin
        .from("outreach_generation_runs")
        .insert([
          { ...runPayload, idempotency_key: `latest-a-${Date.now()}` },
          { ...runPayload, idempotency_key: `latest-b-${Date.now()}` },
          { ...runPayload, idempotency_key: `latest-c-${Date.now()}` },
        ])
        .select();
      const [firstRun, secondRun, archivedRun] = runs!;
      const tiedAt = new Date(Date.now() + 60_000).toISOString();
      const commonDraft = {
        workspace_id: ctx.wsId,
        project_id: ctx.pId,
        company_id: ctx.companyId,
        decision_role_id: ctx.primaryDrId,
        channel: "email",
        message_type: "initial_contact",
        language: "en",
        body: "Latest selection test",
        tone: "professional",
        length: "medium",
        source_type: "generated",
        current_version_number: 1,
        is_current: true,
        created_by: ctx.ownerUserId,
        created_at: tiedAt,
        updated_at: tiedAt,
      };
      const { data: drafts } = await admin
        .from("outreach_drafts")
        .insert([
          { ...commonDraft, source_run_id: firstRun!.id, status: "draft" },
          { ...commonDraft, source_run_id: secondRun!.id, status: "draft" },
          {
            ...commonDraft,
            source_run_id: archivedRun!.id,
            status: "archived",
            updated_at: new Date(Date.now() + 120_000).toISOString(),
          },
        ])
        .select();

      const expected = drafts!
        .filter((draft) => draft.status !== "archived")
        .sort((a, b) => b.id.localeCompare(a.id))[0];
      const latest = await getLatestProjectCompanyOutreachDraft(ctx.wsId, ctx.pId, ctx.companyId);
      expect(latest?.id).toBe(expected!.id);
      expect(latest?.status).not.toBe("archived");
      await expect(
        getLatestProjectCompanyOutreachDraft(
          ctx.wsId,
          "00000000-0000-0000-0000-000000000000",
          ctx.companyId,
        ),
      ).resolves.toBeNull();
      await expect(
        getLatestProjectCompanyOutreachDraft(
          ctx.wsId,
          ctx.pId,
          "00000000-0000-0000-0000-000000000000",
        ),
      ).resolves.toBeNull();
      await expect(
        getLatestProjectCompanyOutreachDraft(ctx.otherWsId, ctx.pId, ctx.companyId),
      ).resolves.toBeNull();

      await admin
        .from("outreach_drafts")
        .delete()
        .in(
          "id",
          drafts!.map((draft) => draft.id),
        );
      await admin
        .from("outreach_generation_runs")
        .delete()
        .in(
          "id",
          runs!.map((run) => run.id),
        );
    });
  });

  describe("usage loading", () => {
    it("uses the same centralized Free plan for display and enforcement", async () => {
      const usage = await getWorkspaceUsageWithClient(admin, ctx.wsId);
      const displayedUsage = await getOutreachUsageAction();
      expect(typeof usage.outreachGenerationsUsed).toBe("number");
      expect(usage.outreachGenerationsUsed).toBeGreaterThanOrEqual(0);
      expect(displayedUsage).toEqual({
        used: usage.outreachGenerationsUsed,
        limit: plan.outreachGenerationsPerPeriod,
        remaining: Math.max(0, plan.outreachGenerationsPerPeriod - usage.outreachGenerationsUsed),
      });
    });
  });
});
