import { requireWorkspace } from "@/lib/auth/session";
import { getBillingSettings } from "@/features/billing/services/billing-settings-service";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Billing settings" };

export default async function BillingSettingsPage() {
  const workspace = await requireWorkspace();
  const { resolution, subscription, usage, aiUsage } = await getBillingSettings(
    workspace.workspace.id,
  );
  const plan = resolution.plan;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Billing and usage"
        description="Authoritative subscription and workspace usage information."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {plan.name}
              <Badge>{subscription?.subscription_status ?? "free"}</Badge>
            </CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Billing provider:{" "}
              <strong>{subscription?.billing_provider ?? "Not configured"}</strong>
            </p>
            <p>
              Current period:{" "}
              {subscription?.current_period_start && subscription.current_period_end
                ? `${new Date(subscription.current_period_start).toLocaleDateString()} – ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : "Free plan has no billing period"}
            </p>
            {subscription?.cancel_at_period_end && (
              <p className="text-warning">Cancels at the end of the current period.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
            <CardDescription>Only verified billing providers can change plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Billing setup is not available yet.</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Current authoritative counters and limits.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Usage
            label="Active projects"
            value={usage.activeProjects}
            limit={plan.maxActiveProjects}
          />
          <Usage
            label="Project creations"
            value={usage.creationsUsed}
            limit={plan.projectCreationsPerPeriod}
          />
          <Usage
            label="Outreach generations"
            value={usage.outreachGenerationsUsed}
            limit={plan.outreachGenerationsPerPeriod}
          />
          <Usage
            label="AI operations"
            value={aiUsage.operations}
            limit={plan.aiOperationsPerPeriod}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number | null }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {limit === null ? "" : ` / ${limit}`}
      </p>
    </div>
  );
}
