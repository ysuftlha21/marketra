-- 0005_grant_service_role
-- The service_role also needs explicit table grants in some Supabase project configurations.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
