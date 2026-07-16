-- Add current_stage to product_analysis_runs with a check constraint

ALTER TABLE public.product_analysis_runs
ADD COLUMN IF NOT EXISTS current_stage text;

ALTER TABLE public.product_analysis_runs
ADD CONSTRAINT product_analysis_runs_current_stage_check
CHECK (
  current_stage IS NULL OR 
  current_stage IN (
    'preparing_project_data',
    'validating_website',
    'reading_website_content',
    'preparing_product_context',
    'running_intelligence_analysis',
    'validating_analysis_output',
    'saving_results',
    'finalizing_analysis'
  )
);
