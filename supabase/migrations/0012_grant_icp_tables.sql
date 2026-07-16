-- 0012: grant service_role + authenticated access to Phase 5 tables
grant all on public.icp_profiles to service_role;
grant all on public.icp_generation_runs to service_role;

grant select, insert, update on public.icp_profiles to authenticated;
grant select, insert, update on public.icp_generation_runs to authenticated;
