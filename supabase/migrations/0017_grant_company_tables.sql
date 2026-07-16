-- 0017: grant service_role + authenticated access to Phase 6 tables
grant all on public.company_discovery_runs to service_role;
grant all on public.companies to service_role;
grant all on public.project_companies to service_role;

grant select, insert, update on public.company_discovery_runs to authenticated;
grant select, insert, update on public.companies to authenticated;
grant select, insert, update on public.project_companies to authenticated;
