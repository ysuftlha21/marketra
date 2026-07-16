-- workspace_usage_periods tracks accumulated usage per period
CREATE TABLE IF NOT EXISTS public.workspace_usage_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    metric text NOT NULL,
    used integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_usage_periods_unique_idx 
ON public.workspace_usage_periods (workspace_id, metric, period_start, period_end);

ALTER TABLE public.workspace_usage_periods ENABLE ROW LEVEL SECURITY;

-- workspace_usage_events records individual consumption events
CREATE TABLE IF NOT EXISTS public.workspace_usage_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    metric text NOT NULL,
    amount integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_usage_events_idempotency_idx 
ON public.workspace_usage_events (workspace_id, idempotency_key);

ALTER TABLE public.workspace_usage_events ENABLE ROW LEVEL SECURITY;

-- Service role access only for these internal tracking tables
CREATE POLICY "service_role_usage_periods" ON public.workspace_usage_periods
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_role_usage_events" ON public.workspace_usage_events
    USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_usage_periods TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_usage_events TO authenticated, service_role;

-- Updated_at trigger
CREATE TRIGGER workspace_usage_periods_touch_updated_at
  BEFORE UPDATE ON public.workspace_usage_periods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
