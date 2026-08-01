import { createServerClient } from "@/lib/db/supabase-server";
import type { ProjectStatus } from "../domain/project-status";
import type { AnalysisRunStatus } from "../domain/analysis-status";
import type { Json } from "@/lib/db/database.types";

export interface ProjectRow {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  slug: string;
  website_url: string | null;
  product_description: string;
  target_customer_summary: string | null;
  business_model: string | null;
  pricing_summary: string | null;
  current_markets: string[];
  preferred_language: string;
  status: ProjectStatus;
  additional_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ProjectSummaryRow {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  status: ProjectStatus;
  updated_at: string;
  created_at: string;
}

export interface AnalysisRunRow {
  id: string;
  workspace_id: string;
  project_id: string;
  requested_by: string;
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  provider_version: string | null;
  status: AnalysisRunStatus;
  current_stage: string | null;
  input_snapshot: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error_code: string | null;
  safe_error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createProject(
  wsId: string,
  userId: string,
  data: {
    name: string;
    slug: string;
    websiteUrl?: string;
    productDescription: string;
    targetCustomerSummary?: string;
    businessModel?: string;
    pricingSummary?: string;
    currentMarkets: string[];
    preferredLanguage: string;
  },
): Promise<ProjectRow> {
  const supabase = await createServerClient();
  const { data: row, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: wsId,
      created_by: userId,
      name: data.name,
      slug: data.slug,
      website_url: data.websiteUrl ?? null,
      product_description: data.productDescription,
      target_customer_summary: data.targetCustomerSummary ?? null,
      business_model: data.businessModel ?? null,
      pricing_summary: data.pricingSummary ?? null,
      current_markets: data.currentMarkets,
      preferred_language: data.preferredLanguage,
    })
    .select(
      "id, workspace_id, created_by, name, slug, website_url, product_description, target_customer_summary, business_model, pricing_summary, current_markets, preferred_language, status, additional_context, created_at, updated_at, archived_at",
    )
    .single();
  if (error) throw error;
  return row as unknown as ProjectRow;
}

export async function getProjectById(wsId: string, projectId: string): Promise<ProjectRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, created_by, name, slug, website_url, product_description, target_customer_summary, business_model, pricing_summary, current_markets, preferred_language, status, additional_context, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", wsId)
    .eq("id", projectId)
    .maybeSingle();
  return (data as unknown as ProjectRow) ?? null;
}

export async function getProjectBySlug(
  wsId: string,
  slug: string,
  includeArchived = false,
): Promise<ProjectRow | null> {
  const supabase = await createServerClient();
  let query = supabase
    .from("projects")
    .select(
      "id, workspace_id, created_by, name, slug, website_url, product_description, target_customer_summary, business_model, pricing_summary, current_markets, preferred_language, status, additional_context, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", wsId)
    .eq("slug", slug);
  if (!includeArchived) {
    query = query.neq("status", "archived");
  }
  const { data } = await query.maybeSingle();
  return (data as unknown as ProjectRow) ?? null;
}

export async function listWorkspaceProjects(
  wsId: string,
  includeArchived = false,
): Promise<ProjectSummaryRow[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("projects")
    .select("id, name, slug, website_url, status, updated_at, created_at")
    .eq("workspace_id", wsId)
    .order("updated_at", { ascending: false });
  if (!includeArchived) {
    query = query.neq("status", "archived");
  }
  const { data } = await query;
  return (data as unknown as ProjectSummaryRow[]) ?? [];
}

export async function updateProject(
  wsId: string,
  projectId: string,
  data: Record<string, unknown>,
): Promise<ProjectRow> {
  const supabase = await createServerClient();
  const updateData = { ...data, updated_at: new Date().toISOString() };
  const { data: row, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("workspace_id", wsId)
    .eq("id", projectId)
    .select(
      "id, workspace_id, created_by, name, slug, website_url, product_description, target_customer_summary, business_model, pricing_summary, current_markets, preferred_language, status, additional_context, created_at, updated_at, archived_at",
    )
    .single();
  if (error) throw error;
  return row as unknown as ProjectRow;
}

export async function deleteProject(wsId: string, projectId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("workspace_id", wsId)
    .eq("id", projectId);
  if (error) throw error;
}

export async function createAnalysisRun(
  wsId: string,
  projectId: string,
  userId: string,
  data: {
    provider: string;
    model: string;
    promptVersion: string;
    schemaVersion: string;
    providerVersion?: string | null;
    current_stage?: string | null;
    inputSnapshot: Record<string, unknown>;
  },
): Promise<AnalysisRunRow> {
  const supabase = await createServerClient();
  const { data: row, error } = await supabase
    .from("product_analysis_runs")
    .insert({
      workspace_id: wsId,
      project_id: projectId,
      requested_by: userId,
      provider: data.provider,
      model: data.model,
      prompt_version: data.promptVersion,
      schema_version: data.schemaVersion,
      provider_version: data.providerVersion ?? null,
      current_stage: data.current_stage ?? null,
      status: "pending",
      input_snapshot: data.inputSnapshot as Json,
    })
    .select(
      "id, workspace_id, project_id, requested_by, provider, model, prompt_version, schema_version, provider_version, status, current_stage, input_snapshot, output, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .single();
  if (error) throw error;
  return row as unknown as AnalysisRunRow;
}

export async function updateAnalysisRun(
  wsId: string,
  runId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("product_analysis_runs")
    .update(data as Record<string, never>)
    .eq("workspace_id", wsId)
    .eq("id", runId);
  if (error) throw error;
}

export async function getLatestAnalysisRun(projectId: string): Promise<AnalysisRunRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("product_analysis_runs")
    .select(
      "id, workspace_id, project_id, requested_by, provider, model, prompt_version, schema_version, provider_version, status, current_stage, input_snapshot, output, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as AnalysisRunRow) ?? null;
}

export async function getLatestSuccessfulAnalysisRun(
  projectId: string,
): Promise<AnalysisRunRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("product_analysis_runs")
    .select(
      "id, workspace_id, project_id, requested_by, provider, model, prompt_version, schema_version, provider_version, status, current_stage, input_snapshot, output, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as AnalysisRunRow) ?? null;
}

export async function getAnalysisRun(wsId: string, runId: string): Promise<AnalysisRunRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("product_analysis_runs")
    .select(
      "id, workspace_id, project_id, requested_by, provider, model, prompt_version, schema_version, provider_version, status, current_stage, input_snapshot, output, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("id", runId)
    .maybeSingle();
  return (data as unknown as AnalysisRunRow) ?? null;
}

export async function listAnalysisRuns(
  wsId: string,
  projectId: string,
  limit = 20,
): Promise<AnalysisRunRow[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("product_analysis_runs")
    .select(
      "id, workspace_id, project_id, requested_by, provider, model, prompt_version, schema_version, provider_version, status, current_stage, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as AnalysisRunRow[]) ?? [];
}

export async function hasActiveAnalysisRun(projectId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("product_analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .in("status", ["pending", "running"]);
  return (data ?? []).length > 0;
}

export async function getExistingSlugs(wsId: string): Promise<string[]> {
  const supabase = await createServerClient();
  const { data } = await supabase.from("projects").select("slug").eq("workspace_id", wsId);
  return ((data as { slug: string }[]) ?? []).map((r) => r.slug.toLowerCase());
}

export interface ClarificationAnswerRow {
  id: string;
  workspace_id: string;
  project_id: string;
  source_analysis_run_id: string;
  question_key: string;
  question_text: string;
  answer: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function getClarificationAnswers(
  wsId: string,
  projectId: string,
): Promise<ClarificationAnswerRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("project_clarification_answers")
    .select(
      "id, workspace_id, project_id, source_analysis_run_id, question_key, question_text, answer, created_by, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as unknown as ClarificationAnswerRow[];
}

export async function saveClarificationAnswer(
  wsId: string,
  projectId: string,
  runId: string,
  userId: string,
  questionKey: string,
  questionText: string,
  answer: string,
): Promise<ClarificationAnswerRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("project_clarification_answers")
    .upsert(
      {
        workspace_id: wsId,
        project_id: projectId,
        source_analysis_run_id: runId,
        question_key: questionKey,
        question_text: questionText,
        answer,
        created_by: userId,
      },
      {
        onConflict: "source_analysis_run_id, question_key",
      },
    )
    .select(
      "id, workspace_id, project_id, source_analysis_run_id, question_key, question_text, answer, created_by, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data as unknown as ClarificationAnswerRow;
}
