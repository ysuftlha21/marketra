-- 0020_project_permissions.sql
-- Fix missing grants on projects and product_analysis_runs for the authenticated role.
-- Due to an earlier glitch, the privileges applied in 0010 were lost.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_analysis_runs TO authenticated;
