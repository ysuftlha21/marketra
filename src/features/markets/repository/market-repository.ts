import { createServerClient } from "@/lib/db/supabase-server";
import type { TargetCountryStatus } from "../domain/target-country-status";
import type { MarketAnalysisRunStatus } from "../domain/market-analysis-status";
import type { Json } from "@/lib/db/database.types";

export interface TargetCountryRow {
  id: string;
  workspace_id: string;
  project_id: string;
  country_code: string;
  country_name: string;
  region_code: string | null;
  status: TargetCountryStatus;
  priority: number | null;
  notes: string | null;
  analysis_assumptions: Record<string, unknown> | null;
  added_by: string;
  shortlisted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketAnalysisRunRow {
  id: string;
  workspace_id: string;
  project_id: string;
  project_target_country_id: string;
  requested_by: string;
  provider: string;
  model: string | null;
  analysis_version: string;
  prompt_version: string | null;
  status: MarketAnalysisRunStatus;
  input_snapshot: Record<string, unknown>;
  intelligence_snapshot: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error_code: string | null;
  safe_error_message: string | null;
  source_metadata: Record<string, unknown> | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetCountrySummary {
  id: string;
  country_code: string;
  country_name: string;
  region_code: string | null;
  status: TargetCountryStatus;
  priority: number | null;
  notes: string | null;
  added_by: string;
  shortlisted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  latest_analysis_status: MarketAnalysisRunStatus | null;
  latest_recommendation: string | null;
  latest_confidence: string | null;
  last_analyzed_at: string | null;
}

// ── Target Countries ──────────────────────────────────────────────

export async function addTargetCountry(
  wsId: string,
  projectId: string,
  userId: string,
  countryCode: string,
  countryName: string,
  regionCode?: string | null,
): Promise<TargetCountryRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("project_target_countries")
    .insert({
      workspace_id: wsId,
      project_id: projectId,
      country_code: countryCode.toUpperCase(),
      country_name: countryName,
      region_code: regionCode ?? null,
      added_by: userId,
    })
    .select(
      "id, workspace_id, project_id, country_code, country_name, region_code, status, priority, notes, analysis_assumptions, added_by, shortlisted_at, rejected_at, created_at, updated_at",
    )
    .single();
  if (error) throw error;
  return data as unknown as TargetCountryRow;
}

export async function getTargetCountry(
  wsId: string,
  countryId: string,
): Promise<TargetCountryRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("project_target_countries")
    .select(
      "id, workspace_id, project_id, country_code, country_name, region_code, status, priority, notes, analysis_assumptions, added_by, shortlisted_at, rejected_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("id", countryId)
    .maybeSingle();
  return (data as unknown as TargetCountryRow) ?? null;
}

export async function getTargetCountryByCode(
  wsId: string,
  projectId: string,
  countryCode: string,
): Promise<TargetCountryRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("project_target_countries")
    .select(
      "id, workspace_id, project_id, country_code, country_name, region_code, status, priority, notes, analysis_assumptions, added_by, shortlisted_at, rejected_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .eq("country_code", countryCode.toUpperCase())
    .maybeSingle();
  return (data as unknown as TargetCountryRow) ?? null;
}

export async function updateTargetCountry(
  wsId: string,
  countryId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("project_target_countries")
    .update(data as Record<string, never>)
    .eq("workspace_id", wsId)
    .eq("id", countryId);
  if (error) throw error;
}

export async function deleteTargetCountry(wsId: string, countryId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("project_target_countries")
    .delete()
    .eq("workspace_id", wsId)
    .eq("id", countryId);
  if (error) throw error;
}

export async function listProjectTargetCountries(
  wsId: string,
  projectId: string,
): Promise<TargetCountrySummary[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("project_target_countries")
    .select(
      `
      id, country_code, country_name, region_code, status, priority, notes,
      added_by, shortlisted_at, rejected_at, created_at, updated_at
    `,
    )
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (!data?.length) return [];

  const rows = data as unknown as TargetCountryRow[];
  const countryIds = rows.map((r) => r.id);

  const { data: latestRuns } = await supabase
    .from("market_analysis_runs")
    .select("project_target_country_id, status, output, completed_at")
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .in("project_target_country_id", countryIds)
    .order("created_at", { ascending: false });

  const runMap = new Map<
    string,
    {
      status: MarketAnalysisRunStatus;
      recommendation: string | null;
      confidence: string | null;
      completedAt: string | null;
    }
  >();
  for (const run of latestRuns ?? []) {
    const ptcId = (run as Record<string, unknown>).project_target_country_id as string;
    if (!runMap.has(ptcId)) {
      const output = (run as Record<string, unknown>).output as Record<string, unknown> | null;
      runMap.set(ptcId, {
        status: (run as Record<string, unknown>).status as MarketAnalysisRunStatus,
        recommendation: (output?.entryRecommendation as string) ?? null,
        confidence: (output?.confidence as string) ?? null,
        completedAt: (run as Record<string, unknown>).completed_at as string | null,
      });
    }
  }

  return rows.map((r) => {
    const runInfo = runMap.get(r.id);
    return {
      id: r.id,
      country_code: r.country_code,
      country_name: r.country_name,
      region_code: r.region_code,
      status: r.status,
      priority: r.priority,
      notes: r.notes,
      added_by: r.added_by,
      shortlisted_at: r.shortlisted_at,
      rejected_at: r.rejected_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      latest_analysis_status: runInfo?.status ?? null,
      latest_recommendation: runInfo?.recommendation ?? null,
      latest_confidence: runInfo?.confidence ?? null,
      last_analyzed_at: runInfo?.completedAt ?? null,
    };
  });
}

// ── Market Analysis Runs ──────────────────────────────────────────

export async function createMarketAnalysisRun(
  wsId: string,
  projectId: string,
  targetCountryId: string,
  userId: string,
  data: {
    provider: string;
    model?: string;
    analysisVersion: string;
    promptVersion?: string;
    inputSnapshot: Record<string, unknown>;
  },
): Promise<MarketAnalysisRunRow> {
  const supabase = await createServerClient();
  const { data: row, error } = await supabase
    .from("market_analysis_runs")
    .insert({
      workspace_id: wsId,
      project_id: projectId,
      project_target_country_id: targetCountryId,
      requested_by: userId,
      provider: data.provider,
      model: data.model ?? null,
      analysis_version: data.analysisVersion,
      prompt_version: data.promptVersion ?? null,
      input_snapshot: data.inputSnapshot as Json,
    })
    .select(
      "id, workspace_id, project_id, project_target_country_id, requested_by, provider, model, analysis_version, prompt_version, status, input_snapshot, intelligence_snapshot, output, error_code, safe_error_message, source_metadata, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .single();
  if (error) throw error;
  return row as unknown as MarketAnalysisRunRow;
}

export async function updateMarketAnalysisRun(
  wsId: string,
  runId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("market_analysis_runs")
    .update(data as Record<string, never>)
    .eq("workspace_id", wsId)
    .eq("id", runId);
  if (error) throw error;
}

export async function getMarketAnalysisRun(
  wsId: string,
  runId: string,
): Promise<MarketAnalysisRunRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("market_analysis_runs")
    .select(
      "id, workspace_id, project_id, project_target_country_id, requested_by, provider, model, analysis_version, prompt_version, status, input_snapshot, intelligence_snapshot, output, error_code, safe_error_message, source_metadata, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("id", runId)
    .maybeSingle();
  return (data as unknown as MarketAnalysisRunRow) ?? null;
}

export async function getLatestMarketAnalysisRun(
  wsId: string,
  targetCountryId: string,
): Promise<MarketAnalysisRunRow | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("market_analysis_runs")
    .select(
      "id, workspace_id, project_id, project_target_country_id, requested_by, provider, model, analysis_version, prompt_version, status, input_snapshot, intelligence_snapshot, output, error_code, safe_error_message, source_metadata, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", targetCountryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as MarketAnalysisRunRow) ?? null;
}

export async function listMarketAnalysisRuns(
  wsId: string,
  targetCountryId: string,
  limit = 20,
): Promise<MarketAnalysisRunRow[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("market_analysis_runs")
    .select(
      `
      id, workspace_id, project_id, project_target_country_id, requested_by,
      provider, model, analysis_version, prompt_version, status,
      error_code, safe_error_message, input_tokens, output_tokens, estimated_cost,
      started_at, completed_at, created_at, updated_at
    `,
    )
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", targetCountryId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as MarketAnalysisRunRow[]) ?? [];
}

export async function hasActiveMarketAnalysisRun(targetCountryId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("market_analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_target_country_id", targetCountryId)
    .in("status", ["pending", "running"]);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function targetCountryHasAnalysisRuns(
  wsId: string,
  targetCountryId: string,
): Promise<boolean> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("market_analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", targetCountryId);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
