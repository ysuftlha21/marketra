import { createServerClient } from "@/lib/db/supabase-server";
import type { IcpProfileStatus } from "../domain/icp-status";
import type { IcpGenRunStatus } from "../domain/icp-gen-status";

export interface IcpProfileRow {
  id: string;
  workspace_id: string;
  project_id: string;
  project_target_country_id: string;
  market_analysis_run_id: string;
  product_analysis_run_id: string | null;
  created_by: string;
  current_generation_run_id: string | null;
  version: number;
  status: IcpProfileStatus;
  name: string;
  summary: string;
  country_code: string;
  industry_segments: Record<string, unknown>;
  company_attributes: Record<string, unknown>;
  buyer_roles: Record<string, unknown>[];
  user_roles: Record<string, unknown>[];
  pains: unknown[];
  desired_outcomes: unknown[];
  purchase_triggers: string[];
  qualification_signals: string[];
  disqualification_signals: string[];
  objections: Record<string, unknown>[];
  preferred_channels: Record<string, unknown> | null;
  technology_context: Record<string, unknown> | null;
  procurement_context: Record<string, unknown> | null;
  localization_requirements: Record<string, unknown> | null;
  assumptions: string[];
  missing_information: string[];
  validation_questions: string[];
  confidence: string | null;
  confidence_reason: string;
  user_edits: Record<string, unknown> | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcpGenRunRow {
  id: string;
  workspace_id: string;
  project_id: string;
  project_target_country_id: string;
  market_analysis_run_id: string;
  requested_by: string;
  provider: string;
  model: string | null;
  generation_version: string;
  prompt_version: string | null;
  status: IcpGenRunStatus;
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

// -----------------------------------------------------------------------
// Typed query builder helpers for tables not yet in the Database type.
// The `any` return is a documented boundary — remove when Database type
// includes icp_profiles and icp_generation_runs.
// -----------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbQuery = any;

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

function icpProfilesQuery(supabase: Supabase): DbQuery {
  return supabase.from("icp_profiles" as never);
}

function icpGenRunsQuery(supabase: Supabase): DbQuery {
  return supabase.from("icp_generation_runs" as never);
}

const ICP_PROFILE_COLS =
  "id, workspace_id, project_id, project_target_country_id, market_analysis_run_id, product_analysis_run_id, created_by, current_generation_run_id, version, status, name, summary, country_code, industry_segments, company_attributes, buyer_roles, user_roles, pains, desired_outcomes, purchase_triggers, qualification_signals, disqualification_signals, objections, preferred_channels, technology_context, procurement_context, localization_requirements, assumptions, missing_information, validation_questions, confidence, confidence_reason, user_edits, approved_by, approved_at, rejected_by, rejected_at, archived_at, created_at, updated_at";

const ICP_GEN_RUN_COLS =
  "id, workspace_id, project_id, project_target_country_id, market_analysis_run_id, requested_by, provider, model, generation_version, prompt_version, status, input_snapshot, output, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at";

async function client() {
  return await createServerClient();
}

// ── ICP Profiles ─────────────────────────────────────────────────

export async function createIcpProfile(
  _wsId: string,
  data: Record<string, unknown>,
): Promise<IcpProfileRow> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase).insert(data).select(ICP_PROFILE_COLS).single();
  if (r.error) throw r.error;
  return r.data as unknown as IcpProfileRow;
}

export async function getLatestIcpProfile(
  wsId: string,
  tcId: string,
): Promise<IcpProfileRow | null> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select(ICP_PROFILE_COLS)
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", tcId)
    .order("version" as never, { ascending: false } as never)
    .limit(1)
    .maybeSingle();
  if (r.error) throw r.error;
  return (r.data as unknown as IcpProfileRow) ?? null;
}

export async function getLatestApprovedIcpProfile(
  wsId: string,
  tcId: string,
): Promise<IcpProfileRow | null> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select(ICP_PROFILE_COLS)
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", tcId)
    .eq("status", "approved")
    .order("version" as never, { ascending: false } as never)
    .limit(1)
    .maybeSingle();
  if (r.error) throw r.error;
  return (r.data as unknown as IcpProfileRow) ?? null;
}

export async function getIcpProfile(wsId: string, icpId: string): Promise<IcpProfileRow | null> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select(ICP_PROFILE_COLS)
    .eq("workspace_id", wsId)
    .eq("id", icpId)
    .maybeSingle();
  return (r.data as unknown as IcpProfileRow) ?? null;
}

export async function updateIcpProfile(
  wsId: string,
  icpId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase).update(data).eq("workspace_id", wsId).eq("id", icpId);
  if (r.error) throw r.error;
}

export async function listIcpProfiles(
  wsId: string,
  tcId: string,
  limit = 20,
): Promise<IcpProfileRow[]> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select("id, version, status, name, summary, confidence, created_at, approved_at, rejected_at")
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", tcId)
    .order("version" as never, { ascending: false } as never)
    .limit(limit);
  return (r.data as unknown as IcpProfileRow[]) ?? [];
}

export async function getIcpProfilesForComparison(
  wsId: string,
  projectId: string,
): Promise<IcpProfileRow[]> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select(
      "id, version, status, name, summary, confidence, country_code, project_target_country_id, industry_segments, company_attributes, buyer_roles, pains, purchase_triggers, qualification_signals, disqualification_signals, procurement_context, localization_requirements, assumptions, missing_information",
    )
    .eq("workspace_id", wsId)
    .eq("project_id", projectId)
    .order("created_at" as never, { ascending: false } as never)
    .limit(20);
  return (r.data as unknown as IcpProfileRow[]) ?? [];
}

export async function getNextVersion(wsId: string, tcId: string): Promise<number> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select("version")
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", tcId)
    .order("version" as never, { ascending: false } as never)
    .limit(1);
  return ((r.data as unknown as { version: number }[])?.[0]?.version ?? 0) + 1;
}

// ── ICP Generation Runs ──────────────────────────────────────────

export async function createIcpGenRun(
  _wsId: string,
  data: Record<string, unknown>,
): Promise<IcpGenRunRow> {
  const supabase = await client();
  const r = await icpGenRunsQuery(supabase).insert(data).select(ICP_GEN_RUN_COLS).single();
  if (r.error) throw r.error;
  return r.data as unknown as IcpGenRunRow;
}

export async function updateIcpGenRun(
  wsId: string,
  runId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = await client();
  const r = await icpGenRunsQuery(supabase).update(data).eq("workspace_id", wsId).eq("id", runId);
  if (r.error) throw r.error;
}

export async function getIcpGenRun(wsId: string, runId: string): Promise<IcpGenRunRow | null> {
  const supabase = await client();
  const r = await icpGenRunsQuery(supabase)
    .select(ICP_GEN_RUN_COLS)
    .eq("workspace_id", wsId)
    .eq("id", runId)
    .maybeSingle();
  return (r.data as unknown as IcpGenRunRow) ?? null;
}

export async function listIcpGenRuns(
  wsId: string,
  tcId: string,
  limit = 20,
): Promise<IcpGenRunRow[]> {
  const supabase = await client();
  const r = await icpGenRunsQuery(supabase)
    .select(
      "id, workspace_id, project_id, project_target_country_id, requested_by, provider, model, generation_version, prompt_version, status, error_code, safe_error_message, input_tokens, output_tokens, estimated_cost, started_at, completed_at, created_at, updated_at",
    )
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", tcId)
    .order("created_at" as never, { ascending: false } as never)
    .limit(limit);
  return (r.data as unknown as IcpGenRunRow[]) ?? [];
}

export async function hasActiveIcpRun(tcId: string): Promise<boolean> {
  const supabase = await client();
  const r = await icpGenRunsQuery(supabase)
    .select("id", { count: "exact", head: true } as never)
    .eq("project_target_country_id", tcId)
    .in("status" as never, ["pending", "running"] as never);
  return ((r.data as unknown[])?.length ?? 0) > 0;
}

export async function targetCountryHasIcpProfiles(wsId: string, tcId: string): Promise<boolean> {
  const supabase = await client();
  const r = await icpProfilesQuery(supabase)
    .select("id", { count: "exact", head: true } as never)
    .eq("workspace_id", wsId)
    .eq("project_target_country_id", tcId);
  return ((r.data as unknown[])?.length ?? 0) > 0;
}
