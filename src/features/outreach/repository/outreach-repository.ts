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
