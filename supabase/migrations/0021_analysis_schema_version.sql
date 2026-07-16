-- 0021_analysis_schema_version
-- Adds explicit schema_version and provider_version to analysis runs.

alter table public.product_analysis_runs
  add column if not exists schema_version text not null default 'v1',
  add column if not exists provider_version text;

-- Create an index to support querying by schema version if needed
create index if not exists analysis_runs_schema_idx on public.product_analysis_runs (schema_version);
