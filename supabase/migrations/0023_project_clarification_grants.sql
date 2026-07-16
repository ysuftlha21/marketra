-- 0023_project_clarification_grants
-- Fix missing grants on project_clarification_answers for the authenticated role.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_clarification_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_clarification_answers TO service_role;
