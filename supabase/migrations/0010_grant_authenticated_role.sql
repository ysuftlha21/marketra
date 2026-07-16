-- 0010: grant authenticated role access to Phase 4 tables
-- Migration 0005 granted service_role access. The authenticated role
-- needs explicit grants on tables created after 0005.

grant select, insert, update, delete on public.project_target_countries to authenticated;
grant select, insert, update on public.market_analysis_runs to authenticated;
grant select, insert on public.product_analyses to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
