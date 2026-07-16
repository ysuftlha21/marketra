-- 0009: regrant service_role access for tables created after 0005
-- Migration 0005 granted access for tables existing at that time.
-- Tables added in 0006-0008 need explicit grants too.

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
