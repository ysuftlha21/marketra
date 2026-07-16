import { createServerClient } from "@/lib/db/supabase-server";
import { createServiceRoleClient } from "@/lib/db/supabase-service";
import type { Database } from "@/lib/db/database.types";

export type OutreachGenerationRunRow =
  Database["public"]["Tables"]["outreach_generation_runs"]["Row"];
export type OutreachGenerationRunInsert =
  Database["public"]["Tables"]["outreach_generation_runs"]["Insert"];
export type OutreachGenerationRunUpdate =
  Database["public"]["Tables"]["outreach_generation_runs"]["Update"];

export type OutreachDraftRow = Database["public"]["Tables"]["outreach_drafts"]["Row"];
export type OutreachDraftInsert = Database["public"]["Tables"]["outreach_drafts"]["Insert"];
export type OutreachDraftUpdate = Database["public"]["Tables"]["outreach_drafts"]["Update"];

export type OutreachDraftVersionRow =
  Database["public"]["Tables"]["outreach_draft_versions"]["Row"];
export type OutreachDraftVersionInsert =
  Database["public"]["Tables"]["outreach_draft_versions"]["Insert"];

export async function createOutreachRun(
  _wsId: string,
  payload: Omit<OutreachGenerationRunInsert, "id" | "created_at" | "updated_at">,
): Promise<OutreachGenerationRunRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_generation_runs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("outreach_generation_runs_active_idx")) {
      throw new Error("ACTIVE_RUN_EXISTS");
    }
    throw error;
  }
  return data;
}

export async function updateOutreachRun(
  wsId: string,
  id: string,
  payload: OutreachGenerationRunUpdate,
): Promise<OutreachGenerationRunRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("outreach_generation_runs")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", wsId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOutreachRun(
  wsId: string,
  id: string,
): Promise<OutreachGenerationRunRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_generation_runs")
    .select()
    .eq("id", id)
    .eq("workspace_id", wsId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getLatestProjectCompanyOutreachRun(
  wsId: string,
  projectId: string,
  companyId: string,
): Promise<OutreachGenerationRunRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_generation_runs")
    .select()
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findActiveOutreachRun(
  wsId: string,
  projectId: string,
  companyId: string,
  decisionRoleId: string,
  channel: string,
  messageType: string,
): Promise<OutreachGenerationRunRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_generation_runs")
    .select()
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .eq("decision_role_id", decisionRoleId)
    .eq("channel", channel)
    .eq("message_type", messageType)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function listOutreachRuns(
  wsId: string,
  companyId: string,
): Promise<OutreachGenerationRunRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_generation_runs")
    .select()
    .eq("workspace_id", wsId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createOutreachDraft(
  _wsId: string,
  payload: Omit<OutreachDraftInsert, "id" | "created_at" | "updated_at">,
): Promise<OutreachDraftRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("outreach_drafts").insert(payload).select().single();

  if (error) throw error;
  return data;
}

export async function getOutreachDraft(wsId: string, id: string): Promise<OutreachDraftRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_drafts")
    .select()
    .eq("id", id)
    .eq("workspace_id", wsId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function listCompanyOutreachDrafts(
  wsId: string,
  companyId: string,
): Promise<OutreachDraftRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_drafts")
    .select()
    .eq("workspace_id", wsId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getOutreachDraftByRun(
  wsId: string,
  runId: string,
): Promise<OutreachDraftRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_drafts")
    .select()
    .eq("workspace_id", wsId)
    .eq("source_run_id", runId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestProjectCompanyOutreachDraft(
  wsId: string,
  projectId: string,
  companyId: string,
): Promise<OutreachDraftRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_drafts")
    .select()
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateOutreachDraft(
  wsId: string,
  id: string,
  payload: OutreachDraftUpdate,
): Promise<OutreachDraftRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_drafts")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", wsId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createOutreachDraftVersion(
  _wsId: string,
  payload: Omit<OutreachDraftVersionInsert, "id" | "created_at">,
): Promise<OutreachDraftVersionRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("outreach_draft_versions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("outreach_draft_versions_unique_idx")) {
      throw new Error("DUPLICATE_VERSION");
    }
    throw error;
  }
  return data;
}

export async function getOutreachDraftVersions(
  wsId: string,
  draftId: string,
): Promise<OutreachDraftVersionRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("outreach_draft_versions")
    .select()
    .eq("workspace_id", wsId)
    .eq("outreach_draft_id", draftId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return data;
}

type DraftRpc = (
  name: string,
  args: Record<string, string | number | null>,
) => Promise<{ data: OutreachDraftRow | null; error: { code?: string; message: string } | null }>;

function draftRpcError(error: { code?: string; message: string }) {
  if (error.code === "40001" || error.message.includes("stale_version")) {
    throw new Error("STALE_VERSION");
  }
  if (error.code === "42501" || error.message.includes("forbidden")) {
    throw new Error("FORBIDDEN");
  }
  if (error.code === "PT404") throw new Error("DRAFT_NOT_FOUND");
  if (error.code === "22023") throw new Error("INVALID_TRANSITION");
  throw new Error("DRAFT_OPERATION_FAILED");
}

export async function createDraftVersionAtomic(input: {
  draftId: string;
  expectedVersion: number;
  subject: string | null;
  body: string;
  changeType: "edited" | "restored";
  restoreVersion?: number;
}): Promise<OutreachDraftRow> {
  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as DraftRpc;
  const { data, error } = await rpc("create_outreach_draft_version", {
    p_draft_id: input.draftId,
    p_expected_version: input.expectedVersion,
    p_subject: input.subject,
    p_body: input.body,
    p_change_type: input.changeType,
    p_restore_version: input.restoreVersion ?? null,
  });
  if (error) draftRpcError(error);
  if (!data) throw new Error("DRAFT_OPERATION_FAILED");
  return data;
}

export async function transitionDraftAtomic(input: {
  draftId: string;
  expectedVersion: number;
  targetStatus: "draft" | "approved" | "rejected" | "archived";
  reason?: string;
}): Promise<OutreachDraftRow> {
  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as DraftRpc;
  const { data, error } = await rpc("transition_outreach_draft", {
    p_draft_id: input.draftId,
    p_expected_version: input.expectedVersion,
    p_target_status: input.targetStatus,
    p_reason: input.reason ?? null,
  });
  if (error) draftRpcError(error);
  if (!data) throw new Error("DRAFT_OPERATION_FAILED");
  return data;
}

export interface OutreachDashboardFilters {
  projectId?: string;
  countryId?: string;
  channel?: string;
  status?: string;
  language?: string;
  companySearch?: string;
  page: number;
  pageSize: number;
}

export async function listWorkspaceOutreachDrafts(wsId: string, filters: OutreachDashboardFilters) {
  const supabase = await createServerClient();
  let query = supabase
    .from("outreach_drafts")
    .select(
      "*, projects!inner(name,slug), companies!inner(name), company_decision_roles!inner(role_title), outreach_generation_runs!inner(country_id, project_target_countries!inner(country_code))",
      { count: "exact" },
    )
    .eq("workspace_id", wsId)
    .neq("status", "archived");
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.countryId) query = query.eq("outreach_generation_runs.country_id", filters.countryId);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.language) query = query.eq("language", filters.language);
  if (filters.companySearch) query = query.ilike("companies.name", `%${filters.companySearch}%`);
  const from = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function listOutreachDashboardFilterOptions(wsId: string) {
  const supabase = await createServerClient();
  const [projects, countries] = await Promise.all([
    supabase.from("projects").select("id,name").eq("workspace_id", wsId).order("name"),
    supabase
      .from("project_target_countries")
      .select("id,country_code")
      .eq("workspace_id", wsId)
      .order("country_code"),
  ]);
  if (projects.error || countries.error) throw projects.error ?? countries.error;
  return { projects: projects.data ?? [], countries: countries.data ?? [] };
}
