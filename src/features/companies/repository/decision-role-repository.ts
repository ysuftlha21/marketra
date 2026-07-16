import { createServerClient } from "@/lib/db/supabase-server";
import { createServiceRoleClient } from "@/lib/db/supabase-service";
import type { Database } from "@/lib/db/database.types";

export type DecisionRoleRunRow = Database["public"]["Tables"]["decision_role_runs"]["Row"];
export type DecisionRoleRunInsert = Database["public"]["Tables"]["decision_role_runs"]["Insert"];
export type DecisionRoleRunUpdate = Database["public"]["Tables"]["decision_role_runs"]["Update"];

export type CompanyDecisionRoleRow = Database["public"]["Tables"]["company_decision_roles"]["Row"];
export type CompanyDecisionRoleInsert =
  Database["public"]["Tables"]["company_decision_roles"]["Insert"];
export type CompanyDecisionRoleUpdate =
  Database["public"]["Tables"]["company_decision_roles"]["Update"];

export type DecisionRoleFeedbackRow = Database["public"]["Tables"]["decision_role_feedback"]["Row"];
export type DecisionRoleFeedbackInsert =
  Database["public"]["Tables"]["decision_role_feedback"]["Insert"];

export async function createDecisionRoleRun(
  _wsId: string,
  payload: Omit<DecisionRoleRunInsert, "id" | "created_at" | "updated_at">,
): Promise<DecisionRoleRunRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("decision_role_runs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("decision_role_runs_active_idx")) {
      throw new Error("ACTIVE_RUN_EXISTS");
    }
    throw error;
  }
  return data;
}

export async function updateDecisionRoleRun(
  wsId: string,
  id: string,
  payload: DecisionRoleRunUpdate,
): Promise<DecisionRoleRunRow> {
  // Using service client because progress updates might happen in background edge functions
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("decision_role_runs")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", wsId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDecisionRoleRun(
  wsId: string,
  id: string,
): Promise<DecisionRoleRunRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("decision_role_runs")
    .select()
    .eq("id", id)
    .eq("workspace_id", wsId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function findLatestDecisionRoleRun(
  wsId: string,
  companyId: string,
): Promise<DecisionRoleRunRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("decision_role_runs")
    .select()
    .eq("workspace_id", wsId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function listDecisionRoleRuns(
  wsId: string,
  companyId: string,
): Promise<DecisionRoleRunRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("decision_role_runs")
    .select()
    .eq("workspace_id", wsId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCompanyDecisionRole(
  _wsId: string,
  payload: Omit<CompanyDecisionRoleInsert, "id" | "created_at" | "updated_at">,
): Promise<CompanyDecisionRoleRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("company_decision_roles")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCompanyDecisionRolesByRun(
  wsId: string,
  runId: string,
): Promise<CompanyDecisionRoleRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("company_decision_roles")
    .select()
    .eq("workspace_id", wsId)
    .eq("source_run_id", runId)
    .order("fit_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCompanyDecisionRoles(
  wsId: string,
  companyId: string,
): Promise<CompanyDecisionRoleRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("company_decision_roles")
    .select()
    .eq("workspace_id", wsId)
    .eq("company_id", companyId)
    .neq("status", "archived")
    .order("fit_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateCompanyDecisionRole(
  wsId: string,
  roleId: string,
  payload: CompanyDecisionRoleUpdate,
): Promise<CompanyDecisionRoleRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("company_decision_roles")
    .update(payload)
    .eq("id", roleId)
    .eq("workspace_id", wsId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unsetPrimaryRole(
  wsId: string,
  projectId: string,
  companyId: string,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("company_decision_roles")
    .update({ is_primary: false })
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .eq("is_primary", true);
  if (error) throw error;
}

export async function unsetSecondaryRole(
  wsId: string,
  projectId: string,
  companyId: string,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("company_decision_roles")
    .update({ is_secondary: false })
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .eq("is_secondary", true);
  if (error) throw error;
}

export async function insertDecisionRoleFeedback(
  _wsId: string,
  payload: Omit<DecisionRoleFeedbackInsert, "id" | "created_at">,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("decision_role_feedback").insert(payload);

  if (error) throw error;
}
